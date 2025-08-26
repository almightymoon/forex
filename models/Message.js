const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['announcement', 'message', 'notification'],
    default: 'message'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    studentName: String,
    email: String,
    read: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  courseName: String,
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  attachments: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['file', 'image', 'video', 'link']
    }
  }],
  readCount: {
    type: Number,
    default: 0
  },
  totalRecipients: {
    type: Number,
    default: 0
  },
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ status: 1, scheduledFor: 1 });
messageSchema.index({ 'recipients.studentId': 1 });

// Pre-save middleware to update totalRecipients
messageSchema.pre('save', function(next) {
  this.totalRecipients = this.recipients.length;
  this.updatedAt = new Date();
  next();
});

// Method to mark message as read by a student
messageSchema.methods.markAsRead = function(studentId) {
  const recipient = this.recipients.find(r => r.studentId.toString() === studentId.toString());
  if (recipient && !recipient.read) {
    recipient.read = true;
    recipient.readAt = new Date();
    this.readCount = this.recipients.filter(r => r.read).length;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to get read statistics
messageSchema.methods.getReadStats = function() {
  const readCount = this.recipients.filter(r => r.read).length;
  const unreadCount = this.totalRecipients - readCount;
  return { readCount, unreadCount, totalRecipients: this.totalRecipients };
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
