const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const User = require('../models/User');

const router = express.Router();

// Admin-only notification tooling (email templates, bulk sends, scheduling, stats).

router.get('/templates', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const emailTemplates = require('../services/emailTemplates');
    const templates = emailTemplates.getAllTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email templates',
      message: error.message
    });
  }
});

router.post('/refresh-transporter', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const NotificationService = require('../services/notificationService');
    const success = await NotificationService.refreshEmailTransporter();
    if (!success) {
      return res.status(500).json({ success: false, error: 'Failed to refresh email transporter' });
    }
    res.json({ success: true, message: 'Email transporter refreshed successfully' });
  } catch (error) {
    console.error('Refresh transporter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh email transporter',
      message: error.message
    });
  }
});

router.post(
  '/send-template',
  [
    authenticateToken,
    requireAdmin,
    body('templateName').notEmpty().withMessage('Template name is required'),
    body('recipients').isArray().withMessage('Recipients array is required'),
    body('variables').isObject().withMessage('Variables object is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { templateName, recipients, variables } = req.body;
      const emailTemplates = require('../services/emailTemplates');
      const renderedTemplate = emailTemplates.renderTemplate(templateName, variables);

      const results = [];
      for (const recipient of recipients) {
        try {
          const success = await notificationService.sendEmail({
            to: recipient,
            subject: renderedTemplate.subject,
            html: renderedTemplate.html,
            text: renderedTemplate.text
          });
          results.push({ recipient, success, error: success ? null : 'Failed to send email' });
        } catch (error) {
          results.push({ recipient, success: false, error: error.message });
        }
      }

      const successfulCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      res.json({
        success: true,
        message: `Emails sent: ${successfulCount} successful, ${failedCount} failed`,
        results,
        template: { name: templateName, subject: renderedTemplate.subject }
      });
    } catch (error) {
      console.error('Send template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send template emails',
        message: error.message
      });
    }
  }
);

router.get('/test-config', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const configTest = await notificationService.testEmailConfiguration();
    if (configTest.success) {
      return res.json({ success: true, message: 'Email configuration is valid', details: configTest.message });
    }
    res.status(400).json({ success: false, error: configTest.error, message: 'Email configuration is invalid' });
  } catch (error) {
    console.error('Test config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration',
      message: error.message
    });
  }
});

router.post(
  '/test-email',
  [authenticateToken, requireAdmin, body('testEmail').isEmail().withMessage('Valid test email is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { testEmail } = req.body;
      const configTest = await notificationService.testEmailConfiguration();
      if (!configTest.success) {
        return res.status(400).json({ error: 'Email configuration invalid', message: configTest.error });
      }

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

      if (!success) {
        return res.status(500).json({
          error: 'Failed to send test email',
          message: 'Check your email configuration and try again'
        });
      }

      res.json({ message: 'Test email sent successfully', recipient: testEmail });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Failed to send test email', message: error.message });
    }
  }
);

router.post(
  '/send',
  [
    authenticateToken,
    requireAdmin,
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data object is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { userIds, type, data } = req.body;
      const users = await User.find({ _id: { $in: userIds } });
      if (users.length !== userIds.length) {
        return res.status(400).json({
          error: 'Some user IDs are invalid',
          message: 'One or more user IDs do not exist'
        });
      }

      const results = await notificationService.sendBulkNotification(userIds, type, data);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        message: 'Bulk notification completed',
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ error: 'Failed to send notifications', message: error.message });
    }
  }
);

router.post(
  '/send-admin',
  [
    authenticateToken,
    requireAdmin,
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data object is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { type, data } = req.body;
      const results = await notificationService.sendAdminNotification(type, data);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        message: 'Admin notification completed',
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      });
    } catch (error) {
      console.error('Send admin notification error:', error);
      res.status(500).json({ error: 'Failed to send admin notifications', message: error.message });
    }
  }
);

router.post(
  '/broadcast',
  [
    authenticateToken,
    requireAdmin,
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data object is required'),
    body('userRole').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid user role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { type, data, userRole } = req.body;
      const userQuery = userRole ? { role: userRole } : {};
      const users = await User.find(userQuery);
      const userIds = users.map((u) => u._id.toString());
      if (userIds.length === 0) {
        return res.status(400).json({
          error: 'No users found',
          message: userRole ? `No users found with role: ${userRole}` : 'No users found in the system'
        });
      }

      const results = await notificationService.sendBulkNotification(userIds, type, data);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        message: 'Broadcast notification completed',
        targetRole: userRole || 'all users',
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results: results.slice(0, 10)
      });
    } catch (error) {
      console.error('Broadcast notification error:', error);
      res.status(500).json({ error: 'Failed to broadcast notifications', message: error.message });
    }
  }
);

router.get('/stats', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const NotificationService = require('../services/notificationService');
    const notificationStats = await NotificationService.getNotificationStatistics();

    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

    const emailEnabledUsers = await User.countDocuments({ 'preferences.emailNotifications': { $ne: false } });
    const smsCapableUsers = await User.countDocuments({ phone: { $exists: true, $ne: '' } });

    const roleStats = {};
    usersByRole.forEach((role) => {
      roleStats[role._id] = role.count;
    });

    res.json({
      message: 'Notification statistics',
      stats: {
        notifications: notificationStats.summary,
        notificationDetails: {
          byChannel: notificationStats.byChannel,
          recentActivity: notificationStats.recentActivity,
          failedNotifications: notificationStats.failedNotifications,
          scheduledNotifications: notificationStats.scheduledNotifications
        },
        users: {
          total: totalUsers,
          byRole: roleStats,
          emailEnabled: emailEnabledUsers,
          smsCapable: smsCapableUsers,
          pushEnabled: totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to get notification statistics', message: error.message });
  }
});

router.post(
  '/schedule',
  [
    authenticateToken,
    requireAdmin,
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data object is required'),
    body('scheduledFor').isISO8601().withMessage('Valid scheduled date is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { userIds, type, data, scheduledFor } = req.body;
      const users = await User.find({ _id: { $in: userIds } });
      if (users.length !== userIds.length) {
        return res.status(400).json({
          error: 'Some user IDs are invalid',
          message: 'One or more user IDs do not exist'
        });
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          error: 'Invalid scheduled date',
          message: 'Scheduled date must be in the future'
        });
      }

      const bulkNotificationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const results = [];
      for (const userId of userIds) {
        try {
          const trackingRecord = await notificationService.scheduleNotification(
            userId,
            type,
            data,
            scheduledFor,
            bulkNotificationId
          );
          results.push({ userId, success: true, trackingId: trackingRecord._id });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        message: 'Notifications scheduled successfully',
        scheduledFor,
        total: results.length,
        successful: successCount,
        failed: failureCount,
        bulkNotificationId,
        results
      });
    } catch (error) {
      console.error('Schedule notification error:', error);
      res.status(500).json({ error: 'Failed to schedule notifications', message: error.message });
    }
  }
);

router.post('/process-scheduled', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const results = await notificationService.processScheduledNotifications();
    res.json({ message: 'Scheduled notifications processed', results });
  } catch (error) {
    console.error('Process scheduled notifications error:', error);
    res.status(500).json({ error: 'Failed to process scheduled notifications', message: error.message });
  }
});

router.get('/scheduled', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const NotificationTracking = require('../models/NotificationTracking');
    const scheduledNotifications = await NotificationTracking.getScheduledNotifications();
    res.json({ message: 'Scheduled notifications retrieved', notifications: scheduledNotifications });
  } catch (error) {
    console.error('Get scheduled notifications error:', error);
    res.status(500).json({ error: 'Failed to get scheduled notifications', message: error.message });
  }
});

router.post(
  '/send-emails',
  [
    authenticateToken,
    requireAdmin,
    body('emails').isArray().withMessage('Emails array is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').optional().isIn(['info', 'success', 'warning', 'error']).withMessage('Valid type required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { emails, subject, message } = req.body;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = emails.filter((email) => emailRegex.test(email));

      if (validEmails.length === 0) {
        return res.status(400).json({
          error: 'No valid email addresses provided',
          message: 'Please provide at least one valid email address'
        });
      }

      const results = [];
      for (const email of validEmails) {
        try {
          const success = await notificationService.sendEmail({
            to: email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #111827; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Forex Navigators</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa;">
                  <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
                  <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
                    ${String(message).replace(/\n/g, '<br>')}
                  </div>
                  <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 12px; color: #6c757d;">
                    This email was sent from Forex Navigators platform. If you did not expect this email, please ignore it.
                  </div>
                </div>
              </div>
            `,
            text: `${subject}\n\n${message}\n\n---\nThis email was sent from Forex Navigators platform.`
          });

          results.push({ email, success, error: success ? null : 'Failed to send email' });
        } catch (error) {
          results.push({ email, success: false, error: error.message });
        }
      }

      const successfulCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      res.json({
        success: true,
        message: `Emails sent: ${successfulCount} successful, ${failedCount} failed`,
        total: validEmails.length,
        successful: successfulCount,
        failed: failedCount,
        results
      });
    } catch (error) {
      console.error('Send emails error:', error);
      res.status(500).json({ error: 'Failed to send emails', message: error.message });
    }
  }
);

module.exports = router;

