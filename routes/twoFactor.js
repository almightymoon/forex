const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const TwoFactorAuthService = require('../services/twoFactorAuth');
const Settings = require('../models/Settings');
const notificationService = require('../services/notificationService');

const router = express.Router();

// @route   POST /api/2fa/setup
// @desc    Generate 2FA secret and QR code for setup
// @access  Private (Admin only)
router.post('/setup', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const user = req.user;
    
    // Check if 2FA is already enabled
    if (user.security && user.security.twoFactorEnabled) {
      return res.status(400).json({
        error: '2FA is already enabled',
        message: 'Two-factor authentication is already active for this account'
      });
    }

    // Get platform name from settings
    const settings = await Settings.getSettings();
    const platformName = settings.platformName || 'Forex Navigators';

    // Generate secret and QR code
    const setupData = await TwoFactorAuthService.generateSecret(user.email, platformName);

    res.json({
      message: '2FA setup data generated',
      secret: setupData.secret,
      qrCode: setupData.qrCode,
      manualEntryKey: setupData.manualEntryKey,
      instructions: {
        step1: 'Install an authenticator app (Google Authenticator, Authy, etc.)',
        step2: 'Scan the QR code or manually enter the key',
        step3: 'Enter the 6-digit code from your app to complete setup'
      }
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      error: 'Failed to generate 2FA setup',
      message: 'An error occurred while setting up two-factor authentication'
    });
  }
});

// @route   POST /api/2fa/enable
// @desc    Enable 2FA with verification
// @access  Private (Admin only)
router.post('/enable', [
  authenticateToken,
  requireAdmin,
  body('secret').notEmpty().withMessage('Secret is required'),
  body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
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

    const { secret, token } = req.body;
    const userId = req.user._id;

    // Enable 2FA
    const result = await TwoFactorAuthService.enableTwoFactor(userId, secret, token);

    if (result.success) {
      // Send 2FA enabled notification
      try {
        await notificationService.sendNotificationToUser(userId, '2fa_enabled', {
          enabledAt: new Date().toISOString(),
          backupCodesCount: result.backupCodes.length
        });
      } catch (notificationError) {
        console.error('Failed to send 2FA notification:', notificationError);
        // Don't fail the operation if notification fails
      }

      res.json({
        message: '2FA enabled successfully',
        backupCodes: result.backupCodes,
        warning: 'Save these backup codes in a secure location. You will not be able to see them again.'
      });
    } else {
      res.status(400).json({
        error: 'Failed to enable 2FA',
        message: result.error
      });
    }

  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({
      error: 'Failed to enable 2FA',
      message: 'An error occurred while enabling two-factor authentication'
    });
  }
});

// @route   POST /api/2fa/disable
// @desc    Disable 2FA with verification
// @access  Private (Admin only)
router.post('/disable', [
  authenticateToken,
  requireAdmin,
  body('token').notEmpty().withMessage('Verification code is required')
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

    const { token } = req.body;
    const userId = req.user._id;

    // Disable 2FA
    const result = await TwoFactorAuthService.disableTwoFactor(userId, token);

    if (result.success) {
      res.json({
        message: '2FA disabled successfully',
        warning: 'Two-factor authentication has been disabled. Your account is now less secure.'
      });
    } else {
      res.status(400).json({
        error: 'Failed to disable 2FA',
        message: result.error
      });
    }

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      error: 'Failed to disable 2FA',
      message: 'An error occurred while disabling two-factor authentication'
    });
  }
});

// @route   POST /api/2fa/verify
// @desc    Verify 2FA token during login
// @access  Public (but requires pending 2FA login session)
router.post('/verify', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('tempToken').notEmpty().withMessage('Temporary login token is required'),
  body('twoFactorCode').notEmpty().withMessage('2FA code is required')
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

    const { email, tempToken, twoFactorCode } = req.body;

    // Verify temporary token (this would be stored in Redis in production)
    // For now, we'll implement a simple JWT-based approach
    const jwt = require('jsonwebtoken');
    let tempTokenData;
    
    try {
      tempTokenData = jwt.verify(tempToken, process.env.JWT_SECRET + '_2FA_TEMP');
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid temporary token',
        message: 'Your login session has expired. Please start over.'
      });
    }

    if (tempTokenData.email !== email) {
      return res.status(401).json({
        error: 'Token mismatch',
        message: 'Invalid login session'
      });
    }

    // Get user
    const User = require('../models/User');
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Invalid login session'
      });
    }

    // Verify 2FA code
    const verificationResult = await TwoFactorAuthService.verifyLogin(user, twoFactorCode);

    if (verificationResult.success) {
      // Generate final JWT token
      const { generateTokenWithTimeout } = require('../middleware/sessionTimeout');
      const token = await generateTokenWithTimeout(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        message: 'Login successful',
        user: user.getPublicProfile(),
        token,
        twoFactorVerified: true,
        ...(verificationResult.backupCodeUsed && {
          warning: `Backup code used. ${verificationResult.remainingBackupCodes} backup codes remaining.`
        })
      });
    } else {
      res.status(401).json({
        error: '2FA verification failed',
        message: verificationResult.error
      });
    }

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      error: 'Failed to verify 2FA',
      message: 'An error occurred during two-factor authentication'
    });
  }
});

// @route   GET /api/2fa/status
// @desc    Get 2FA status for current user
// @access  Private (Admin only)
router.get('/status', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      twoFactorEnabled: user.security?.twoFactorEnabled || false,
      backupCodesCount: user.security?.backupCodes?.length || 0,
      message: user.security?.twoFactorEnabled 
        ? '2FA is enabled and active'
        : '2FA is not enabled'
    });

  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      error: 'Failed to get 2FA status',
      message: 'An error occurred while checking two-factor authentication status'
    });
  }
});

module.exports = router;
