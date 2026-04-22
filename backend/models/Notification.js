const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants/notificationTypes');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  link: {
    type: String,
    default: null
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { limit = 50, unreadOnly = false, type, cursorId } = options;
  
  let query = { userId };
  
  if (unreadOnly) {
    query.read = false;
  }
  
  if (type) {
    query.type = type;
  }

  // Cursor pagination: when cursorId is provided, return items older than the cursor doc.
  // We use createdAt + _id as a stable sort key.
  const buildQueryWithCursor = async () => {
    if (!cursorId) return query;
    const cursorDoc = await this.findOne({ _id: cursorId, userId }).select('_id createdAt').lean();
    if (!cursorDoc) return query;
    return {
      ...query,
      $or: [
        { createdAt: { $lt: cursorDoc.createdAt } },
        { createdAt: cursorDoc.createdAt, _id: { $lt: cursorDoc._id } }
      ]
    };
  };
  
  return buildQueryWithCursor().then((q) =>
    this.find(q)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
  );
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = function(userId, notificationIds) {
  return this.updateMany(
    { 
      userId, 
      _id: { $in: notificationIds } 
    },
    { 
      read: true, 
      readAt: new Date() 
    }
  );
};

// Static method to mark all user notifications as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { 
      read: true, 
      readAt: new Date() 
    }
  );
};

// Static method to mark a single notification as read
notificationSchema.statics.markOneAsRead = function(userId, notificationId) {
  return this.updateOne(
    { userId, _id: notificationId },
    { read: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Static method to create notification
notificationSchema.statics.createNotification = function(notificationData) {
  return this.create(notificationData);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
