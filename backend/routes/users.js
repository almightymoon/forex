const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken, requireRole, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin or self)
// @access  Private
router.put('/:id', [
  authenticateToken,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone, country, role } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (role && req.user.role === 'admin') updateData.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// @route   GET /api/users/profile/me
// @desc    Get current user profile
// @access  Private
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/users/profile/me
// @desc    Update current user profile
// @access  Private
router.put('/profile/me', [
  authenticateToken,
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('country').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// @route   GET /api/users/activity/recent
// @desc    Get user's recent activity feed
// @access  Private
router.get('/activity/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const activities = [];

    // 1. Get recent notifications
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    notifications.forEach(notif => {
      activities.push({
        type: 'notification',
        id: notif._id,
        title: notif.title,
        message: notif.message,
        icon: getNotificationIcon(notif.type),
        color: getNotificationColor(notif.type),
        timestamp: notif.createdAt,
        read: notif.read,
        data: notif.data
      });
    });

    // 2. Get recent course progress updates
    const CourseProgress = require('../models/CourseProgress');
    const recentProgress = await CourseProgress.find({ student: userId })
      .populate('course', 'title')
      .sort({ lastAccessed: -1 })
      .limit(5)
      .lean();

    recentProgress.forEach(progress => {
      if (progress.lastAccessed) {
        const completedCount = progress.contentProgress?.filter(c => c.isCompleted).length || 0;
        const totalCount = progress.contentProgress?.length || 0;
        
        if (completedCount > 0) {
          activities.push({
            type: 'course_progress',
            id: `progress_${progress._id}`,
            title: 'Course Progress Updated',
            message: `You completed ${completedCount} lesson${completedCount > 1 ? 's' : ''} in ${progress.course?.title || 'Course'}`,
            icon: 'BookOpen',
            color: 'blue',
            timestamp: progress.lastAccessed,
            courseId: progress.course?._id,
            courseTitle: progress.course?.title
          });
        }
      }
    });

    // 3. Get recent trading signals
    const TradingSignal = require('../models/TradingSignal');
    const recentSignals = await TradingSignal.find({ isPublished: true })
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    recentSignals.forEach(signal => {
      const teacherName = signal.teacher 
        ? `${signal.teacher.firstName} ${signal.teacher.lastName}` 
        : 'Unknown Teacher';
      
      activities.push({
        type: 'trading_signal',
        id: signal._id,
        title: 'New Trading Signal',
        message: `${signal.symbol} ${signal.type} signal posted by ${teacherName}`,
        icon: 'Target',
        color: 'green',
        timestamp: signal.createdAt,
        signalId: signal._id,
        symbol: signal.symbol
      });
    });

    // 4. Get upcoming live sessions
    const LiveSession = require('../models/LiveSession');
    const upcomingSessions = await LiveSession.find({
      status: 'scheduled',
      scheduledAt: { $gte: new Date() }
    })
      .populate('teacher', 'firstName lastName')
      .sort({ scheduledAt: 1 })
      .limit(3)
      .lean();

    upcomingSessions.forEach(session => {
      activities.push({
        type: 'live_session',
        id: session._id,
        title: 'Live Session Available',
        message: `${session.title} - ${new Date(session.scheduledAt).toLocaleDateString()}`,
        icon: 'Play',
        color: 'green',
        timestamp: session.scheduledAt,
        sessionId: session._id,
        meetingLink: session.meetingLink
      });
    });

    // 5. Get recent assignment completions
    const Assignment = require('../models/Assignment');
    const completedAssignments = await Assignment.find({
      'submissions.student': userId,
      'submissions.status': 'submitted'
    })
      .populate('course', 'title')
      .sort({ 'submissions.submittedAt': -1 })
      .limit(5)
      .lean();

    completedAssignments.forEach(assignment => {
      const submission = assignment.submissions?.find(s => 
        s.student.toString() === userId.toString() && s.status === 'submitted'
      );
      
      if (submission) {
        activities.push({
          type: 'assignment',
          id: `assignment_${assignment._id}`,
          title: 'Assignment Submitted',
          message: `You submitted "${assignment.title}" for ${assignment.course?.title || 'Course'}`,
          icon: 'FileText',
          color: 'purple',
          timestamp: submission.submittedAt,
          assignmentId: assignment._id
        });
      }
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return only the requested limit
    res.json({
      success: true,
      activities: activities.slice(0, limit),
      total: activities.length
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recent activity',
      message: error.message 
    });
  }
});

// Helper function to get notification icon
function getNotificationIcon(type) {
  const icons = {
    'assignment': 'FileText',
    'course': 'BookOpen',
    'message': 'MessageSquare',
    'system': 'Bell',
    'payment': 'CreditCard',
    'security': 'Shield'
  };
  return icons[type] || 'Bell';
}

// Helper function to get notification color
function getNotificationColor(type) {
  const colors = {
    'assignment': 'purple',
    'course': 'blue',
    'message': 'indigo',
    'system': 'gray',
    'payment': 'green',
    'security': 'red'
  };
  return colors[type] || 'gray';
}

module.exports = router;
