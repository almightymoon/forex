const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  completionPercentage: {
    type: Number,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: true
  },
  certificateUrl: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  issuedBy: {
    type: String,
    default: 'Trading Education Platform'
  },
  validUntil: {
    type: Date,
    default: function() {
      // Certificate valid for 2 years
      return new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
certificateSchema.index({ student: 1, course: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);