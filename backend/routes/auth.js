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
const { refreshToken } = require('../middleware/sessionTimeout');
const TwoFactorAuthService = require('../services/twoFactorAuth');
const notificationService = require('../services/notificationService');
const referralService = require('../services/referralService');
const cloudinary = require('../config/cloudinary');
const { logActivity } = require('../services/activityLogService');
// Stripe imports removed - payments disabled
// const { stripe, createPaymentIntent } = require('../config/stripe');

const router = express.Router();
const Package = require('../models/Package');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user (payments disabled)
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('paymentMethod').optional().isIn(['credit_card', 'easypaisa', 'jazz_cash', 'binance_wallet']).withMessage('Invalid payment method'),
  body('promoCode').optional().trim().toUpperCase(),
  body('referralCode').optional().trim().toUpperCase(),
  body('selectedPackage').optional().isObject().withMessage('Package selection is required')
], passwordPolicyMiddleware, async (req, res) => {
  try {
    console.log('Registration request received - Payments disabled');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, phone, country, paymentMethod, promoCode, referralCode, selectedPackage } = req.body;
    console.log(`Registering user: ${email}, promoCode: ${promoCode || 'none'}`);

    // STEP 1: Check if user already exists (BEFORE creating anything)
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // STEP 2: Validate promo code if provided (BEFORE creating user)
    // IMPORTANT: This validation MUST complete successfully before user creation
    let promoCodeData = null;
    if (promoCode && promoCode.trim()) {
      const promoCodeUpper = promoCode.trim().toUpperCase();
    
      // Find promo code in database
      promoCodeData = await PromoCode.findOne({ 
        code: promoCodeUpper,
        isActive: true,
        validUntil: { $gt: new Date() }
      });

      // If promo code was provided but not found, return error immediately
      // DO NOT create user if promo code validation fails
      if (!promoCodeData) {
        console.log(`❌ Invalid promo code attempted: ${promoCodeUpper}`);
        return res.status(400).json({
          error: 'Invalid promo code',
          message: 'The promo code you entered is invalid or has expired. Please check and try again.'
        });
      }

      // Check if promo code is applicable to signup
      if (!promoCodeData.applicableTo.includes('signup') && !promoCodeData.applicableTo.includes('all')) {
        console.log(`❌ Promo code ${promoCodeUpper} not applicable to signup`);
        return res.status(400).json({
          error: 'Promo code not applicable',
          message: 'This promo code cannot be used for signup'
        });
      }

      // Check if promo code has reached max uses
      if (promoCodeData.maxUses && promoCodeData.currentUses >= promoCodeData.maxUses) {
        console.log(`❌ Promo code ${promoCodeUpper} has reached max uses`);
        return res.status(400).json({
          error: 'Promo code limit reached',
          message: 'This promo code has reached its maximum usage limit'
        });
      }
      
      console.log(`✅ Promo code ${promoCodeUpper} validated successfully`);
    } else if (promoCode && !promoCode.trim()) {
      // Empty or whitespace-only promo code
      return res.status(400).json({
        error: 'Invalid promo code',
        message: 'Please enter a valid promo code or leave it blank'
      });
    }

    // STEP 3: Validate referral code if provided, or use default referral code from settings
    let finalReferralCode = referralCode ? referralCode.trim().toUpperCase() : null;
    let usedDefaultReferralCode = false;

    // If no referral code provided, use default from database settings
    if (!finalReferralCode) {
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();

      if (settings.defaultReferralCode && settings.defaultReferralCode.trim()) {
        finalReferralCode = settings.defaultReferralCode.trim().toUpperCase();
        usedDefaultReferralCode = true;
        console.log(`No referral code provided, using default from settings: ${finalReferralCode}`);
      }
    }
    
    // Validate referral code (either provided or default)
    if (finalReferralCode) {
      const referrer = await User.findOne({ referralCode: finalReferralCode });
      if (!referrer) {
        // If default referral code doesn't exist, log warning but don't fail registration
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const isDefaultCode = !referralCode && settings.defaultReferralCode && 
          settings.defaultReferralCode.toUpperCase() === finalReferralCode;
        
        if (isDefaultCode) {
          console.warn(`⚠️  Default referral code ${finalReferralCode} does not exist in database. User will be created without referral.`);
          finalReferralCode = null;
        } else {
          return res.status(400).json({
            error: 'Invalid referral code',
            message: 'The referral code you entered is invalid'
          });
        }
      } else {
        console.log(`✅ Referral code validated: ${finalReferralCode} (referrer: ${referrer.email})`);
      }
    }

    // STEP 4: All validations passed - NOW create user
    // IMPORTANT: Only reach this point if ALL validations above passed
    console.log('✅ All validations passed. Creating user...');
    
    // Package selection is optional during registration.
    // If provided, validate against admin-managed packages in DB.
    let packagePrice = 0;
    let normalizedSelectedPackage = null;
    if (selectedPackage && selectedPackage.packageName) {
      const pkg = await Package.findOne({ name: selectedPackage.packageName, isActive: true }).lean();
      if (!pkg) {
        return res.status(400).json({
          error: 'Invalid package',
          message: 'Selected package is not available'
        });
      }
      packagePrice = Number(pkg.price ?? 0);
      normalizedSelectedPackage = {
        packageName: pkg.name,
        price: packagePrice
      };
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      country: country || 'Pakistan',
      isVerified: false, // User must pay first before verification
      isActive: true,
      selectedPackage: normalizedSelectedPackage ? {
        packageName: normalizedSelectedPackage.packageName,
        price: normalizedSelectedPackage.price || packagePrice || 0,
        selectedAt: new Date()
      } : undefined
    };

    // Create user (only after all validations pass)
    console.log(`Creating user for ${email}...`);
      const user = new User(userData);
      await user.save();
    console.log(`✅ User ${email} created successfully in database`);

    await logActivity({
      req,
      actor: { userId: user._id, email: user.email, role: user.role },
      action: 'user.registered',
      entity: { type: 'user', id: user._id, label: user.email },
      metadata: { country: user.country }
    });

    // Generate referral code for new user (non-blocking)
    try {
      await referralService.generateReferralCode(user);
    } catch (refCodeError) {
      console.error('Error generating referral code:', refCodeError);
      // Don't fail registration if referral code generation fails
    }

    // Create referral relationship if referral code provided (or default from env) (non-blocking)
    if (finalReferralCode) {
      try {
        await referralService.createReferralRelationship(user, finalReferralCode);
        console.log(`✅ Referral relationship created for user ${user.email} with referrer ${finalReferralCode}`);
        // Mark when user came from default link only (no ref param) — no commission paid on their purchases
        if (usedDefaultReferralCode) {
          user.referredByDefaultCode = true;
          await user.save();
          console.log(`ℹ️  User ${user.email} referred via default link — no commission will be paid on their purchases`);
        }
      } catch (refError) {
        console.error('Error creating referral relationship:', refError);
        // Don't fail registration if referral fails
      }
    } else {
      console.log(`ℹ️  No referral code used for user ${user.email}`);
    }

    // Record promo code usage if valid (non-blocking, for tracking only)
    if (promoCodeData) {
      try {
        // Just log the usage, don't create payment record
        console.log(`Promo code ${promoCode} used by user ${user._id} (payment disabled)`);
        // Optionally update promo code usage count
        if (promoCodeData.currentUses !== undefined) {
          promoCodeData.currentUses = (promoCodeData.currentUses || 0) + 1;
          await promoCodeData.save();
        }
      } catch (promoUsageError) {
        console.error('Error recording promo code usage:', promoUsageError);
        // Don't fail registration
      }
    }

    // Note: Package selection and payment creation is now handled separately
    // after registration via the /api/payments/create endpoint

    // Send welcome notification (non-blocking)
    try {
      await notificationService.sendNotificationToUser(user._id, 'system', {
        promoCode: promoCode || null,
        promoCodeValid: !!promoCodeData
      });
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
      // Don't fail registration if notification fails
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Get user profile safely
    let userProfile;
    try {
      userProfile = user.getPublicProfile ? user.getPublicProfile() : {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };
    } catch (profileError) {
      console.error('Error getting user profile:', profileError);
      userProfile = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      };
    }

    console.log(`User ${email} registered successfully`);
    
    return res.status(201).json({
      message: 'User registered successfully. Please select a package to continue.',
      user: userProfile,
      token,
      promoCodeApplied: !!promoCodeData,
      requiresPayment: true // Always require payment after registration
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Registration error stack:', error.stack);
    
    // If user was created during error, try to clean it up
    try {
      const createdUser = await User.findByEmail(req.body?.email);
      if (createdUser) {
        console.log('⚠️ User was created but error occurred. Attempting cleanup...');
        // Optionally delete the user if created less than 5 seconds ago
        // This prevents orphaned users from validation errors
        const userAge = Date.now() - new Date(createdUser.createdAt).getTime();
        if (userAge < 5000) { // Created less than 5 seconds ago
          await User.findByIdAndDelete(createdUser._id);
          console.log('⚠️ Cleaned up user created during failed registration');
        }
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    res.status(500).json({
      error: 'Registration failed',
      message: error.message || 'An error occurred during registration',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // Do NOT auto-verify on login.
    // Users without an approved package purchase should remain unverified/pending,
    // and should not appear as "active" in referral trees/admin status.

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

    // Update last login (skip validation to avoid issues with existing users)
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() }, { validateBeforeSave: false });

    // Generate token with session timeout and role
    const token = await generateTokenWithTimeout(user._id, user.role);

    await logActivity({
      req,
      actor: { userId: user._id, email: user.email, role: user.role },
      action: 'user.login',
      entity: { type: 'user', id: user._id, label: user.email }
    });

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
    // Ensure user has referral code
    const user = await User.findById(req.user._id);
    if (!user.referralCode) {
      await referralService.generateReferralCode(user);
    }
    
    // Refresh user from database to get updated referral code
    const updatedUser = await User.findById(req.user._id);
    
    res.json({
      user: updatedUser.getPublicProfile()
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
  body('country').optional().trim(),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('address').optional().trim(),
  body('bio').optional().trim(),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
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

    const { 
      firstName, 
      lastName, 
      phone, 
      country, 
      dateOfBirth, 
      address, 
      bio, 
      preferences 
    } = req.body;
    
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (address) updateData.address = address;
    if (bio) updateData.bio = bio;
    if (preferences) updateData.preferences = preferences;

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

    let emailSent = false;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'Email not registered',
        message: 'This email is not registered. Please sign up first.'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate reset link
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send password reset email
    try {
      const emailTemplate = notificationService.getPasswordResetTemplate(user, {
        resetLink: resetLink,
        expiryTime: '1 hour'
      });

      emailSent = await notificationService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Forex Navigators',
        html: emailTemplate,
        text: `Hello ${user.firstName},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nForex Navigators Team`,
        userId: user._id.toString(),
        type: 'password_reset'
      });

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
        return res.status(503).json({
          error: 'Email service unavailable',
          message: 'We could not send the reset email right now. Please try again later.'
        });
      }
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      return res.status(503).json({
        error: 'Email service unavailable',
        message: 'We could not send the reset email right now. Please try again later.'
      });
    }

    res.json({
      message: 'Password reset link sent',
      // Only include token in development for testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      ...(process.env.NODE_ENV === 'development' ? { exists: true, emailSent } : {})
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

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const currentToken = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!currentToken) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Please provide a valid token'
      });
    }

    const result = await refreshToken(currentToken);
    
    if (result.success) {
      res.json({
        message: 'Token refreshed successfully',
        token: result.token
      });
    } else {
      res.status(401).json({
        error: 'Token refresh failed',
        message: result.error || 'Failed to refresh token'
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing the token'
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
