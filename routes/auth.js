const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PromoCode = require('../models/PromoCode');
const { authenticateToken } = require('../middleware/auth');
const { passwordPolicyMiddleware } = require('../middleware/passwordPolicy');
const { loginSecurityMiddleware } = require('../middleware/loginSecurity');
const { generateTokenWithTimeout } = require('../middleware/sessionTimeout');
const TwoFactorAuthService = require('../services/twoFactorAuth');
const notificationService = require('../services/notificationService');
const cloudinary = require('../config/cloudinary');
const stripe = require('../config/stripe');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user with payment
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('paymentMethod').isIn(['credit_card', 'easypaisa', 'jazz_cash']).withMessage('Invalid payment method'),
  body('promoCode').optional().trim().toUpperCase()
], passwordPolicyMiddleware, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, phone, country, paymentMethod, promoCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Validate promo code if provided
    let discount = 0;
    let promoCodeData = null;
    
    if (promoCode) {
      promoCodeData = await PromoCode.findOne({ 
        code: promoCode.toUpperCase(),
        isActive: true,
        validUntil: { $gt: new Date() }
      });

      if (!promoCodeData) {
        return res.status(400).json({
          error: 'Invalid promo code',
          message: 'The provided promo code is invalid or expired'
        });
      }

      // Check if promo code is applicable to signup
      if (!promoCodeData.applicableTo.includes('signup') && !promoCodeData.applicableTo.includes('all')) {
        return res.status(400).json({
          error: 'Promo code not applicable',
          message: 'This promo code cannot be used for signup'
        });
      }

      // Apply discount
      if (promoCodeData.discountType === 'percentage') {
        discount = (30 * promoCodeData.discountValue) / 100; // 30 is signup fee
      } else {
        discount = promoCodeData.discountValue;
      }
    }

    const signupFee = 30;
    const finalAmount = Math.max(0, signupFee - discount);

    // Create user object
    const userData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      country: country || 'Pakistan',
      paymentMethod,
      promoCode: promoCodeData ? {
        code: promoCodeData.code,
        appliedAt: new Date(),
        discount: discount
      } : undefined
    };

    // If promo code makes signup free, create user immediately
    if (finalAmount === 0) {
      const user = new User(userData);
      await user.save();

      // Record the free signup
      const payment = new Payment({
        user: user._id,
        amount: signupFee,
        currency: 'USD',
        paymentMethod: 'promo_code',
        status: 'completed',
        description: 'Signup fee - Promo code applied',
        type: 'signup',
        promoCode: promoCodeData ? promoCodeData._id : null,
        discountAmount: discount,
        finalAmount: finalAmount,
        transactionId: `FREE_${Date.now()}`
      });

      await payment.save();

      // Update promo code usage
      if (promoCodeData) {
        promoCodeData.recordUsage(user._id, signupFee, discount, finalAmount);
        await promoCodeData.save();
      }

      // Send welcome notification
      try {
        await notificationService.sendNotificationToUser(user._id, 'user_registration', {
          promoCode: promoCode || null,
          signupBonus: discount > 0 ? discount : null
        });
      } catch (notificationError) {
        console.error('Failed to send welcome notification:', notificationError);
        // Don't fail registration if notification fails
      }

      // Generate token
      const token = generateToken(user._id, user.role);

      return res.status(201).json({
        message: 'User registered successfully with promo code',
        user: user.getPublicProfile(),
        token,
        payment: {
          amount: signupFee,
          discount: discount,
          finalAmount: finalAmount
        }
      });
    }

    // Create user with pending payment status
    const user = new User({
      ...userData,
      isVerified: false
    });
    await user.save();

    // Send welcome notification (for users with pending payment)
    try {
      await notificationService.sendNotificationToUser(user._id, 'user_registration', {
        promoCode: promoCode || null,
        signupBonus: discount > 0 ? discount : null,
        pendingPayment: true
      });
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
      // Don't fail registration if notification fails
    }

    // Create pending payment record
    const payment = new Payment({
      user: user._id,
      amount: signupFee,
      currency: 'USD',
      paymentMethod,
      status: 'pending',
      description: 'Signup fee payment',
      type: 'signup',
      promoCode: promoCodeData ? promoCodeData._id : null,
      discountAmount: discount,
      finalAmount: finalAmount
    });

    await payment.save();

    // Process payment based on method
    let paymentResult;
    
    if (paymentMethod === 'credit_card') {
      // Stripe payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: user._id.toString(),
          paymentId: payment._id.toString(),
          type: 'signup'
        }
      });

      paymentResult = {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } else {
      // Local payment methods (Easypaisa, Jazz Cash)
      paymentResult = {
        paymentUrl: `/api/payments/local/${payment._id}`,
        paymentId: payment._id
      };
    }

    res.status(201).json({
      message: 'User registered successfully. Payment required.',
      user: user.getPublicProfile(),
      payment: {
        amount: signupFee,
        discount: discount,
        finalAmount: finalAmount,
        method: paymentMethod,
        status: 'pending'
      },
      paymentDetails: paymentResult
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], loginSecurityMiddleware, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Track failed login attempt for non-existent users too
      if (req.loginSecurity) {
        await req.loginSecurity.trackFailedLogin();
      }
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Track failed login attempt
      if (req.loginSecurity) {
        await req.loginSecurity.trackFailedLogin();
      }
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Clear failed attempts on successful login
    if (req.loginSecurity) {
      req.loginSecurity.clearFailedAttempts();
    }

    // Check if user has completed payment
    if (!user.isVerified) {
      const pendingPayment = await Payment.findOne({
        user: user._id,
        type: 'signup',
        status: 'pending'
      });

      if (pendingPayment) {
        return res.status(402).json({
          error: 'Payment required',
          message: 'Please complete your signup payment to access your account',
          paymentId: pendingPayment._id,
          amount: pendingPayment.finalAmount
        });
      }
    }

    // Check if 2FA is required
    if (TwoFactorAuthService.requiresTwoFactor(user)) {
      // Generate temporary token for 2FA verification (expires in 10 minutes)
      const jwt = require('jsonwebtoken');
      const tempToken = jwt.sign(
        { 
          email: user.email, 
          userId: user._id,
          purpose: '2FA_VERIFICATION'
        },
        process.env.JWT_SECRET + '_2FA_TEMP',
        { expiresIn: '10m' }
      );

      return res.json({
        message: '2FA verification required',
        requiresTwoFactor: true,
        tempToken: tempToken,
        email: user.email
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token with session timeout and role - temporarily simplified
    // const token = await generateTokenWithTimeout(user._id, user.role);
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: user.getPublicProfile(),
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching your profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('country').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, phone, country } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'An error occurred while updating your profile'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await User.findById(req.user._id);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing your password'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, just return success message
    res.json({
      message: 'Password reset instructions sent to your email',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while processing your request'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Invalid reset token'
      });
    }

    // Update password
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Reset token is invalid or expired'
      });
    }

    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred while resetting your password'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // You could implement a blacklist here if needed
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Private
router.post('/verify-email', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.isVerified) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'Your email is already verified'
      });
    }

    // TODO: Send verification email
    // For now, just mark as verified
    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    res.json({
      message: 'Email verification initiated',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      message: 'An error occurred during email verification'
    });
  }
});

module.exports = router;
