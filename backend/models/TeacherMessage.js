const mongoose = require('mongoose');

const teacherMessageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
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
  senderName: {
    type: String,
    required: true
  },
  recipients: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
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
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['file', 'image', 'video', 'link'],
      default: 'file'
    }
  }],
  sentAt: Date,
  readCount: {
    type: Number,
    default: 0
  },
  totalRecipients: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
teacherMessageSchema.index({ sender: 1, createdAt: -1 });
teacherMessageSchema.index({ status: 1 });
teacherMessageSchema.index({ scheduledFor: 1 });
teacherMessageSchema.index({ 'recipients.studentId': 1 });

// Virtual for read rate
teacherMessageSchema.virtual('readRate').get(function() {
  if (this.totalRecipients === 0) return 0;
  return Math.round((this.readCount / this.totalRecipients) * 100);
});

// Method to mark message as read by a student
teacherMessageSchema.methods.markAsRead = function(studentId) {
  const recipient = this.recipients.find(r => r.studentId.toString() === studentId.toString());
  if (recipient && !recipient.read) {
    recipient.read = true;
    recipient.readAt = new Date();
    this.readCount = this.recipients.filter(r => r.read).length;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to send message
teacherMessageSchema.methods.send = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  this.totalRecipients = this.recipients.length;
  return this.save();
};

// Static method to find messages by teacher
teacherMessageSchema.statics.findByTeacher = function(teacherId, limit = 50, skip = 0) {
  return this.find({ sender: teacherId })
    .populate('sender', 'firstName lastName email')
    .populate('courseId', 'title')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to find scheduled messages
teacherMessageSchema.statics.findScheduled = function() {
  return this.find({ 
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  });
};

// Pre-save middleware to update total recipients
teacherMessageSchema.pre('save', function(next) {
  if (this.recipients && this.recipients.length > 0) {
    this.totalRecipients = this.recipients.length;
    this.readCount = this.recipients.filter(r => r.read).length;
  }
  next();
});

module.exports = mongoose.model('TeacherMessage', teacherMessageSchema);

