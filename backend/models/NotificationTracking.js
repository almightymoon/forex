const mongoose = require('mongoose');

const notificationTrackingSchema = new mongoose.Schema({
  // Reference to the notification if it's an in-app notification
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: false
  },
  // User who received the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Type of notification
  type: {
    type: String,
    enum: ['assignment', 'course', 'message', 'system', 'payment', 'payment_pending', 'payment_confirmed', 'account_verified', 'security', 'bulk', 'user_registration', 'referral', 'commission', 'balance', 'balance_credited', 'withdrawal', 'withdrawal_request', 'withdrawal_confirmed', 'admin', 'trade', 'live_session'],
    required: true
  },
  // Channel used for delivery
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in-app'],
    required: true
  },
  // Delivery status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'scheduled', 'pending'],
    required: true,
    default: 'pending'
  },
  // Title of the notification
  title: {
    type: String,
    required: true
  },
  // Content/message
  message: {
    type: String,
    required: true
  },
  // When it was sent
  sentAt: {
    type: Date,
    default: Date.now
  },
  // When it was delivered (for email, this might be when we got confirmation)
  deliveredAt: {
    type: Date
  },
  // When it was read (for in-app notifications)
  readAt: {
    type: Date
  },
  // Error message if failed
  errorMessage: {
    type: String
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For scheduled notifications
  scheduledFor: {
    type: Date
  },
  // For bulk notifications
  bulkNotificationId: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationTrackingSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationTrackingSchema.index({ channel: 1, status: 1 });
notificationTrackingSchema.index({ type: 1, status: 1 });
notificationTrackingSchema.index({ sentAt: 1 });
notificationTrackingSchema.index({ scheduledFor: 1 });

// Static method to get notification statistics
notificationTrackingSchema.statics.getNotificationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get stats by channel
notificationTrackingSchema.statics.getStatsByChannel = function() {
  return this.aggregate([
    {
      $group: {
        _id: { channel: '$channel', status: '$status' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.channel',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

// Static method to get recent notification activity
notificationTrackingSchema.statics.getRecentActivity = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        sentAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

// Static method to get failed notifications
notificationTrackingSchema.statics.getFailedNotifications = function(limit = 50) {
  return this.find({ status: 'failed' })
    .populate('userId', 'email firstName lastName')
    .sort({ sentAt: -1 })
    .limit(limit);
};

// Static method to get scheduled notifications
notificationTrackingSchema.statics.getScheduledNotifications = function() {
  return this.find({ 
    status: 'scheduled',
    scheduledFor: { $gte: new Date() }
  })
    .populate('userId', 'email firstName lastName')
    .sort({ scheduledFor: 1 });
};

// Instance method to mark as delivered
notificationTrackingSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Instance method to mark as failed
notificationTrackingSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Instance method to mark as read
notificationTrackingSchema.methods.markAsRead = function() {
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('NotificationTracking', notificationTrackingSchema);

