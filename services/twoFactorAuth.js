const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

class TwoFactorAuthService {
  /**
   * Generate a secret and QR code for 2FA setup
   * @param {string} userEmail - User's email address
   * @param {string} platformName - Platform name (from settings)
   * @returns {Object} - Secret and QR code data URL
   */
  static async generateSecret(userEmail, platformName = 'Forex Navigators') {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${platformName} (${userEmail})`,
        issuer: platformName,
        length: 32
      });

      // Generate QR code data URL
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        otpauth_url: secret.otpauth_url
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - 6-digit token from authenticator app
   * @param {string} secret - User's 2FA secret
   * @param {number} window - Time window for verification (default: 2)
   * @returns {boolean} - Whether the token is valid
   */
  static verifyToken(token, secret, window = 2) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window
      });
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA recovery
   * @param {number} count - Number of backup codes to generate (default: 8)
   * @returns {Array} - Array of backup codes
   */
  static generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Enable 2FA for a user
   * @param {string} userId - User ID
   * @param {string} secret - 2FA secret
   * @param {string} token - Verification token from user
   * @returns {Object} - Success status and backup codes
   */
  static async enableTwoFactor(userId, secret, token) {
    try {
      // Verify the token first
      const isValid = this.verifyToken(token, secret);
      
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Update user record
      await User.findByIdAndUpdate(userId, {
        $set: {
          'security.twoFactorEnabled': true,
          'security.twoFactorSecret': secret,
          'security.backupCodes': backupCodes
        }
      });

      return {
        success: true,
        backupCodes: backupCodes
      };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      return {
        success: false,
        error: 'Failed to enable 2FA'
      };
    }
  }

  /**
   * Disable 2FA for a user
   * @param {string} userId - User ID
   * @param {string} token - Current 2FA token or backup code
   * @returns {Object} - Success status
   */
  static async disableTwoFactor(userId, token) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.security.twoFactorEnabled) {
        return {
          success: false,
          error: '2FA is not enabled'
        };
      }

      // Check if it's a valid current token or backup code
      const isValidToken = this.verifyToken(token, user.security.twoFactorSecret);
      const isValidBackupCode = user.security.backupCodes.includes(token.toUpperCase());

      if (!isValidToken && !isValidBackupCode) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // If backup code was used, remove it
      if (isValidBackupCode) {
        const updatedBackupCodes = user.security.backupCodes.filter(
          code => code !== token.toUpperCase()
        );
        
        await User.findByIdAndUpdate(userId, {
          $set: {
            'security.backupCodes': updatedBackupCodes
          }
        });
      }

      // Disable 2FA
      await User.findByIdAndUpdate(userId, {
        $set: {
          'security.twoFactorEnabled': false
        },
        $unset: {
          'security.twoFactorSecret': 1,
          'security.backupCodes': 1
        }
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return {
        success: false,
        error: 'Failed to disable 2FA'
      };
    }
  }

  /**
   * Verify 2FA during login
   * @param {Object} user - User object from database
   * @param {string} token - 6-digit token or backup code
   * @returns {Object} - Verification result
   */
  static async verifyLogin(user, token) {
    try {
      if (!user.security.twoFactorEnabled) {
        return {
          success: true,
          message: '2FA not required'
        };
      }

      // Check if it's a valid TOTP token
      const isValidToken = this.verifyToken(token, user.security.twoFactorSecret);
      
      if (isValidToken) {
        return {
          success: true,
          message: '2FA verification successful'
        };
      }

      // Check if it's a backup code
      const isValidBackupCode = user.security.backupCodes && 
                                user.security.backupCodes.includes(token.toUpperCase());
      
      if (isValidBackupCode) {
        // Remove used backup code
        const updatedBackupCodes = user.security.backupCodes.filter(
          code => code !== token.toUpperCase()
        );
        
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'security.backupCodes': updatedBackupCodes
          }
        });

        return {
          success: true,
          message: '2FA verification successful (backup code used)',
          backupCodeUsed: true,
          remainingBackupCodes: updatedBackupCodes.length
        };
      }

      return {
        success: false,
        error: 'Invalid 2FA code'
      };
    } catch (error) {
      console.error('Error verifying 2FA login:', error);
      return {
        success: false,
        error: 'Failed to verify 2FA'
      };
    }
  }

  /**
   * Check if user requires 2FA
   * @param {Object} user - User object
   * @returns {boolean} - Whether 2FA is required
   */
  static requiresTwoFactor(user) {
    return user.security && user.security.twoFactorEnabled;
  }
}

module.exports = TwoFactorAuthService;
