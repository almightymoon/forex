const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const TwoFactorAuthService = require('../services/twoFactorAuth');
const Settings = require('../models/Settings');
const notificationService = require('../services/notificationService');

const router = express.Router();

// @route   POST /api/user2fa/setup
// @desc    Generate 2FA secret and QR code for setup
// @access  Private (All authenticated users)
router.post('/setup', [
  authenticateToken
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

// @route   POST /api/user2fa/enable
// @desc    Enable 2FA with verification
// @access  Private (All authenticated users)
router.post('/enable', [
  authenticateToken,
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

// @route   POST /api/user2fa/disable
// @desc    Disable 2FA with verification
// @access  Private (All authenticated users)
router.post('/disable', [
  authenticateToken,
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

// @route   GET /api/user2fa/status
// @desc    Get 2FA status for current user
// @access  Private (All authenticated users)
router.get('/status', [
  authenticateToken
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

// @route   POST /api/user2fa/verify
// @desc    Verify 2FA token for account operations
// @access  Private (All authenticated users)
router.post('/verify', [
  authenticateToken,
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

    const { token } = req.body;
    const user = req.user;

    // Check if 2FA is enabled
    if (!user.security?.twoFactorEnabled) {
      return res.status(400).json({
        error: '2FA not enabled',
        message: 'Two-factor authentication is not enabled for this account'
      });
    }

    // Verify 2FA code
    const isValid = TwoFactorAuthService.verifyToken(token, user.security.twoFactorSecret);

    if (isValid) {
      res.json({
        message: '2FA verification successful',
        verified: true
      });
    } else {
      res.status(400).json({
        error: 'Invalid 2FA code',
        message: 'The verification code you entered is incorrect'
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

module.exports = router;
