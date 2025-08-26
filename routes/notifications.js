const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/notifications/test
// @desc    Simple test route to verify router is working
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'Notifications router is working!' });
});

// @route   GET /api/notifications/templates
// @desc    Get available email templates
// @access  Private (Admin only)
router.get('/templates', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const emailTemplates = require('../services/emailTemplates');
    const templates = emailTemplates.getAllTemplates();
    
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email templates',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/refresh-transporter
// @desc    Refresh email transporter with updated settings
// @access  Private (Admin only)
router.post('/refresh-transporter', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const notificationService = require('../services/notificationService');
    const success = await notificationService.refreshEmailTransporter();
    
    if (success) {
      res.json({
        success: true,
        message: 'Email transporter refreshed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to refresh email transporter'
      });
    }
  } catch (error) {
    console.error('Refresh transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh email transporter',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/send-template
// @desc    Send email using a specific template
// @access  Private (Admin only)
router.post('/send-template', [
  authenticateToken,
  requireAdmin,
  body('templateName').notEmpty().withMessage('Template name is required'),
  body('recipients').isArray().withMessage('Recipients array is required'),
  body('variables').isObject().withMessage('Variables object is required')
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

    const { templateName, recipients, variables } = req.body;
    
    // Get email template service
    const emailTemplates = require('../services/emailTemplates');
    
    // Render template with variables
    const renderedTemplate = emailTemplates.renderTemplate(templateName, variables);
    
    // Send emails to all recipients
    const results = [];
    for (const recipient of recipients) {
      try {
        const success = await notificationService.sendEmail({
          to: recipient,
          subject: renderedTemplate.subject,
          html: renderedTemplate.html,
          text: renderedTemplate.text
        });
        
        results.push({
          recipient,
          success,
          error: success ? null : 'Failed to send email'
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }
    
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `Emails sent: ${successfulCount} successful, ${failedCount} failed`,
      results: results,
      template: {
        name: templateName,
        subject: renderedTemplate.subject
      }
    });

  } catch (error) {
    console.error('Send template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send template emails',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/test-config
// @desc    Test email configuration without sending email
// @access  Private (Admin only)
router.get('/test-config', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    console.log('Test config endpoint called by user:', req.user.email);
    
    // Test email configuration
    const configTest = await notificationService.testEmailConfiguration();
    console.log('Config test result:', configTest);
    
    if (configTest.success) {
      res.json({
        success: true,
        message: 'Email configuration is valid',
        details: configTest.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: configTest.error,
        message: 'Email configuration is invalid'
      });
    }

  } catch (error) {
    console.error('Test config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/test-email
// @desc    Test email configuration
// @access  Private (Admin only)
router.post('/test-email', [
  authenticateToken,
  requireAdmin,
  body('testEmail').isEmail().withMessage('Valid test email is required')
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

    const { testEmail } = req.body;

    // Test email configuration first
    const configTest = await notificationService.testEmailConfiguration();
    if (!configTest.success) {
      return res.status(400).json({
        error: 'Email configuration invalid',
        message: configTest.error
      });
    }

    // Send test email
    const success = await notificationService.sendEmail({
      to: testEmail,
      subject: 'Test Email - Forex Navigators',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email from your Forex Navigators platform.</p>
        <p>If you're receiving this, your email configuration is working correctly!</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Sent by:</strong> ${req.user.email}</p>
      `,
      text: 'This is a test email from Forex Navigators. Your email configuration is working correctly!'
    });

    if (success) {
      res.json({
        message: 'Test email sent successfully',
        recipient: testEmail
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test email',
        message: 'Check your email configuration and try again'
      });
    }

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to specific users
// @access  Private (Admin only)
router.post('/send', [
  authenticateToken,
  requireAdmin,
  body('userIds').isArray().withMessage('User IDs array is required'),
  body('type').notEmpty().withMessage('Notification type is required'),
  body('data').isObject().withMessage('Notification data object is required')
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

    const { userIds, type, data } = req.body;

    // Validate that all user IDs exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        error: 'Some user IDs are invalid',
        message: 'One or more user IDs do not exist'
      });
    }

    // Send notifications
    const results = await notificationService.sendBulkNotification(userIds, type, data);

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: 'Bulk notification completed',
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results: results
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      error: 'Failed to send notifications',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/send-admin
// @desc    Send notification to all admins
// @access  Private (Admin only)
router.post('/send-admin', [
  authenticateToken,
  requireAdmin,
  body('type').notEmpty().withMessage('Notification type is required'),
  body('data').isObject().withMessage('Notification data object is required')
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

    const { type, data } = req.body;

    // Send admin notifications
    const results = await notificationService.sendAdminNotification(type, data);

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: 'Admin notification completed',
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results: results
    });

  } catch (error) {
    console.error('Send admin notification error:', error);
    res.status(500).json({
      error: 'Failed to send admin notifications',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/broadcast
// @desc    Send notification to all users
// @access  Private (Admin only)
router.post('/broadcast', [
  authenticateToken,
  requireAdmin,
  body('type').notEmpty().withMessage('Notification type is required'),
  body('data').isObject().withMessage('Notification data object is required'),
  body('userRole').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid user role')
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

    const { type, data, userRole } = req.body;

    // Build user query
    const userQuery = userRole ? { role: userRole } : {};
    
    // Get all users (or filtered by role)
    const users = await User.find(userQuery);
    const userIds = users.map(user => user._id.toString());

    if (userIds.length === 0) {
      return res.status(400).json({
        error: 'No users found',
        message: userRole ? `No users found with role: ${userRole}` : 'No users found in the system'
      });
    }

    // Send notifications
    const results = await notificationService.sendBulkNotification(userIds, type, data);

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: 'Broadcast notification completed',
      targetRole: userRole || 'all users',
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results: results.slice(0, 10) // Limit results in response for performance
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      error: 'Failed to broadcast notifications',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/templates
// @desc    Get available notification templates
// @access  Private (Admin only)
router.get('/templates', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const templates = {
      user_registration: {
        name: 'User Registration',
        description: 'Welcome new users after registration',
        dataFields: ['promoCode', 'signupBonus'],
        channels: ['email', 'sms', 'push']
      },
      payment_received: {
        name: 'Payment Received',
        description: 'Confirm payment and activate account',
        dataFields: ['amount', 'transactionId', 'paymentMethod'],
        channels: ['email', 'sms', 'push']
      },
      course_enrollment: {
        name: 'Course Enrollment',
        description: 'Confirm course enrollment',
        dataFields: ['courseName', 'courseId', 'instructorName', 'duration'],
        channels: ['email', 'sms', 'push']
      },
      password_reset: {
        name: 'Password Reset',
        description: 'Send password reset link',
        dataFields: ['resetLink', 'expirationTime'],
        channels: ['email']
      },
      '2fa_enabled': {
        name: '2FA Enabled',
        description: 'Notify when 2FA is enabled',
        dataFields: ['enabledAt'],
        channels: ['email', 'sms', 'push']
      },
      account_locked: {
        name: 'Account Locked',
        description: 'Security alert for locked accounts',
        dataFields: ['attemptCount', 'unlockTime', 'ipAddress'],
        channels: ['email', 'sms']
      },
      system_alert: {
        name: 'System Alert',
        description: 'General system notifications',
        dataFields: ['alertType', 'message', 'severity'],
        channels: ['email', 'push']
      },
      maintenance_notice: {
        name: 'Maintenance Notice',
        description: 'Notify about scheduled maintenance',
        dataFields: ['startTime', 'endTime', 'services'],
        channels: ['email', 'push']
      }
    };

    res.json({
      message: 'Available notification templates',
      templates: templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Failed to get notification templates',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private (Admin only)
router.get('/stats', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    // Get basic user statistics
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get users with email preferences
    const emailEnabledUsers = await User.countDocuments({
      'preferences.emailNotifications': { $ne: false }
    });

    // Get users with phone numbers for SMS
    const smsCapableUsers = await User.countDocuments({
      phone: { $exists: true, $ne: '' }
    });

    // Format role statistics
    const roleStats = {};
    usersByRole.forEach(role => {
      roleStats[role._id] = role.count;
    });

    res.json({
      message: 'Notification statistics',
      stats: {
        users: {
          total: totalUsers,
          byRole: roleStats,
          emailEnabled: emailEnabledUsers,
          smsCapable: smsCapableUsers,
          pushEnabled: totalUsers // Assuming all users can receive push
        },
        channels: {
          email: {
            available: emailEnabledUsers,
            configured: !!process.env.SMTP_HOST
          },
          sms: {
            available: smsCapableUsers,
            configured: false // TODO: Update when SMS service is implemented
          },
          push: {
            available: totalUsers,
            configured: false // TODO: Update when push service is implemented
          }
        }
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      error: 'Failed to get notification statistics',
      message: error.message
    });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', [
  authenticateToken,
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('smsNotifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean')
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

    const { emailNotifications, smsNotifications, pushNotifications } = req.body;
    const userId = req.user._id;

    // Build update object
    const updateObj = {};
    if (typeof emailNotifications === 'boolean') {
      updateObj['preferences.emailNotifications'] = emailNotifications;
    }
    if (typeof smsNotifications === 'boolean') {
      updateObj['preferences.smsNotifications'] = smsNotifications;
    }
    if (typeof pushNotifications === 'boolean') {
      updateObj['preferences.pushNotifications'] = pushNotifications;
    }

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({
        error: 'No preferences provided',
        message: 'At least one notification preference must be specified'
      });
    }

    // Update user preferences
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true, select: 'preferences firstName lastName email' }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: user.preferences || {}
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', [
  authenticateToken
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences firstName lastName email phone');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Default preferences if not set
    const defaultPreferences = {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true
    };

    const preferences = { ...defaultPreferences, ...(user.preferences || {}) };

    res.json({
      message: 'User notification preferences',
      preferences: preferences,
      channels: {
        email: {
          available: !!user.email,
          enabled: preferences.emailNotifications
        },
        sms: {
          available: !!user.phone,
          enabled: preferences.smsNotifications
        },
        push: {
          available: true,
          enabled: preferences.pushNotifications
        }
      }
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences',
      message: error.message
    });
  }
});

module.exports = router;
