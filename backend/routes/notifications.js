const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const { NOTIFICATION_TYPES } = require('../constants/notificationTypes');

const router = express.Router();

// @route   GET /api/notifications/test
// @desc    Simple test route to verify router is working
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'Notifications router is working!' });
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', [
  authenticateToken,
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('smsNotifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('expoPushToken').optional().isString().withMessage('Expo push token must be a string')
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

    const { emailNotifications, smsNotifications, pushNotifications, expoPushToken } = req.body;
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
    if (typeof expoPushToken === 'string' && expoPushToken.trim()) {
      updateObj['preferences.expoPushToken'] = expoPushToken.trim();
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

// ==================== USER NOTIFICATIONS ====================

// @route   GET /api/notifications/user
// @desc    Get user's notifications
// @access  Private
router.get('/user', [
  authenticateToken
], async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { limit = 20, unreadOnly = false, type, cursor } = req.query;
    
    const notifications = await Notification.getUserNotifications(req.user._id, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type,
      cursorId: cursor
    });

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      notifications,
      unreadCount,
      nextCursor: notifications.length > 0 ? notifications[notifications.length - 1]._id : null
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user notifications',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/user/:id
// @desc    Get a single user notification
// @access  Private
router.get('/user/:id', [authenticateToken], async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!n) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, notification: n });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification',
      message: error.message
    });
  }
});

// @route   PUT /api/notifications/user/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put('/user/:id/read', [authenticateToken], async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const exists = await Notification.exists({ _id: req.params.id, userId: req.user._id });
    if (!exists) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await Notification.markOneAsRead(req.user._id, req.params.id);
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    res.json({ success: true, message: 'Notification marked as read', unreadCount });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// @route   PUT /api/notifications/user/read
// @desc    Mark notifications as read
// @access  Private
router.put('/user/read', [
  authenticateToken,
  body('notificationIds').isArray().withMessage('Notification IDs array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const Notification = require('../models/Notification');
    const { notificationIds } = req.body;

    await Notification.markAsRead(req.user._id, notificationIds);

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      message: 'Notifications marked as read',
      unreadCount
    });

  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      message: error.message
    });
  }
});

// @route   PUT /api/notifications/user/read-all
// @desc    Mark all user notifications as read
// @access  Private
router.put('/user/read-all', [
  authenticateToken
], async (req, res) => {
  try {
    const Notification = require('../models/Notification');

    await Notification.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// @route   DELETE /api/notifications/user/:id
// @desc    Delete a user notification
// @access  Private
router.delete('/user/:id', [
  authenticateToken
], async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      message: 'Notification deleted',
      unreadCount
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/create
// @desc    Create a test notification (for testing purposes)
// @access  Private
router.post('/create', [
  authenticateToken,
  body('type').isIn(NOTIFICATION_TYPES).withMessage('Valid type required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const Notification = require('../models/Notification');
    const notificationService = require('../services/notificationService');
    const { type, title, message, priority = 'medium' } = req.body;

    const notification = await notificationService.createNotification({
      user: req.user._id,
      type,
      title,
      message,
    });

    if (priority !== 'medium') {
      notification.priority = priority;
      await notification.save();
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

module.exports = router;
