const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    ref: 'User',
    required: false // Make it optional for manual certificates
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CertificateTemplate',
    required: true
  },
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  },
  instructor: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    }
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['issued', 'pending', 'expired', 'revoked'],
    default: 'issued'
  },
  validUntil: {
    type: Date
  },
  downloadUrl: {
    type: String,
    trim: true
  },
  metadata: {
    courseTitle: String,
    courseDuration: String,
    completionDate: Date,
    totalLessons: Number,
    completedLessons: Number,
    totalAssignments: Number,
    completedAssignments: Number,
    averageScore: Number
  }
});

// Add indexes for better query performance
certificateSchema.index({ courseId: 1 });
certificateSchema.index({ studentId: 1 });
certificateSchema.index({ instructor: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ issuedAt: -1 });
certificateSchema.index({ certificateNumber: 1 });

// Virtual for full instructor name
certificateSchema.virtual('instructor.fullName').get(function() {
  return `${this.instructor.firstName} ${this.instructor.lastName}`;
});

// Virtual for full student name (if different from studentName)
certificateSchema.virtual('student.fullName').get(function() {
  return this.studentName;
});

// Method to check if certificate is expired
certificateSchema.methods.isExpired = function() {
  if (!this.validUntil) return false;
  return new Date() > this.validUntil;
};

// Method to get certificate status
certificateSchema.methods.getStatus = function() {
  if (this.status === 'revoked') return 'revoked';
  if (this.isExpired()) return 'expired';
  return this.status;
};

// Static method to find certificates by course
certificateSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId }).populate('studentId', 'firstName lastName email');
};

// Static method to find certificates by student
certificateSchema.statics.findByStudent = function(studentId) {
  return this.find({ studentId }).populate('courseId', 'title description');
};

// Static method to find certificates by instructor
certificateSchema.statics.findByInstructor = function(instructorId) {
  return this.find({ 'instructor._id': instructorId }).populate('courseId', 'title');
};

module.exports = mongoose.model('Certificate', certificateSchema);
