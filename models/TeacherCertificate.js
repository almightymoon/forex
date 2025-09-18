const mongoose = require('mongoose');

const teacherCertificateSchema = new mongoose.Schema({
  // Teacher who owns this certificate
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Certificate details
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  issuer: {
    type: String,
    required: true,
    trim: true
  },
  
  issueDate: {
    type: Date,
    required: true
  },
  
  expiryDate: {
    type: Date,
    required: false
  },
  
  description: {
    type: String,
    maxlength: 1000,
    required: false
  },
  
  // File information
  fileName: {
    type: String,
    required: true
  },
  
  certificateUrl: {
    type: String,
    required: true
  },
  
  fileSize: {
    type: Number,
    required: true
  },
  
  fileType: {
    type: String,
    required: false
  },
  
  // Verification status
  status: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    default: 'pending'
  },
  
  // Verification details
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  verifiedAt: {
    type: Date,
    required: false
  },
  
  verificationNotes: {
    type: String,
    maxlength: 500,
    required: false
  },
  
  // Additional metadata
  certificateNumber: {
    type: String,
    required: false,
    trim: true
  },
  
  category: {
    type: String,
    enum: ['education', 'professional', 'trading', 'finance', 'other'],
    default: 'other'
  },
  
  skills: [{
    type: String,
    trim: true
  }],
  
  // Visibility settings
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Assignment tracking
  assignmentCount: {
    type: Number,
    default: 0
  },
  
  lastAssignedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
teacherCertificateSchema.index({ teacherId: 1, status: 1 });
teacherCertificateSchema.index({ status: 1 });
teacherCertificateSchema.index({ category: 1 });
teacherCertificateSchema.index({ issueDate: -1 });
teacherCertificateSchema.index({ issuer: 1 });

// Virtual for checking if certificate is expired
teacherCertificateSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual for days until expiry
teacherCertificateSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = this.expiryDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for certificate age
teacherCertificateSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = now - this.issueDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to get certificates by teacher
teacherCertificateSchema.statics.getByTeacher = async function(teacherId, options = {}) {
  const query = { teacherId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return await this.find(query)
    .populate('teacherId', 'name email')
    .populate('verifiedBy', 'name email')
    .sort({ issueDate: -1 });
};

// Static method to get verified certificates
teacherCertificateSchema.statics.getVerified = async function(options = {}) {
  const query = { status: 'verified' };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.teacherId) {
    query.teacherId = options.teacherId;
  }
  
  return await this.find(query)
    .populate('teacherId', 'name email')
    .sort({ issueDate: -1 });
};

// Instance method to mark as verified
teacherCertificateSchema.methods.markAsVerified = async function(verifiedBy, notes = '') {
  this.status = 'verified';
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  if (notes) {
    this.verificationNotes = notes;
  }
  await this.save();
};

// Instance method to mark as rejected
teacherCertificateSchema.methods.markAsRejected = async function(verifiedBy, notes = '') {
  this.status = 'rejected';
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  if (notes) {
    this.verificationNotes = notes;
  }
  await this.save();
};

// Instance method to increment assignment count
teacherCertificateSchema.methods.incrementAssignmentCount = async function() {
  this.assignmentCount += 1;
  this.lastAssignedAt = new Date();
  await this.save();
};

// Pre-save middleware to validate dates
teacherCertificateSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < this.issueDate) {
    return next(new Error('Expiry date cannot be before issue date'));
  }
  next();
});

// Pre-save middleware to generate certificate number if not provided
teacherCertificateSchema.pre('save', function(next) {
  if (!this.certificateNumber && this.isNew) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.certificateNumber = `TC-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('TeacherCertificate', teacherCertificateSchema);
