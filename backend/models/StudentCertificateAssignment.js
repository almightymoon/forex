const mongoose = require('mongoose');

const studentCertificateAssignmentSchema = new mongoose.Schema({
  // Student who receives the certificate
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Teacher who assigns the certificate
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Reference to the teacher's certificate
  teacherCertificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherCertificate',
    required: true
  },
  
  // Assignment details
  assignedDate: {
    type: Date,
    default: Date.now
  },
  
  // Optional: Course context for the assignment
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  
  // Assignment status
  status: {
    type: String,
    enum: ['assigned', 'viewed', 'completed', 'expired'],
    default: 'assigned'
  },
  
  // Optional: Custom message from teacher
  message: {
    type: String,
    maxlength: 500
  },
  
  // Optional: Due date for completion
  dueDate: {
    type: Date
  },
  
  // Completion tracking
  completedAt: {
    type: Date
  },
  
  // Student's completion notes (optional)
  studentNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Teacher's feedback (optional)
  teacherFeedback: {
    type: String,
    maxlength: 1000
  },
  
  // Notification tracking
  notificationsSent: {
    type: Number,
    default: 0
  },
  
  lastNotificationSent: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
studentCertificateAssignmentSchema.index({ studentId: 1, status: 1 });
studentCertificateAssignmentSchema.index({ teacherId: 1, status: 1 });
studentCertificateAssignmentSchema.index({ teacherCertificateId: 1 });
studentCertificateAssignmentSchema.index({ courseId: 1 });
studentCertificateAssignmentSchema.index({ assignedDate: -1 });

// Virtual for checking if assignment is overdue
studentCertificateAssignmentSchema.virtual('isOverdue').get(function() {
  if (this.dueDate && this.status !== 'completed') {
    return new Date() > this.dueDate;
  }
  return false;
});

// Virtual for days until due
studentCertificateAssignmentSchema.virtual('daysUntilDue').get(function() {
  if (this.dueDate && this.status !== 'completed') {
    const now = new Date();
    const diffTime = this.dueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Static method to get assignments for a student
studentCertificateAssignmentSchema.statics.getStudentAssignments = async function(studentId, options = {}) {
  const query = { studentId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.courseId) {
    query.courseId = options.courseId;
  }
  
  return await this.find(query)
    .populate('teacherId', 'name email')
    .populate('teacherCertificateId')
    .populate('courseId', 'title')
    .sort({ assignedDate: -1 });
};

// Static method to get assignments by teacher
studentCertificateAssignmentSchema.statics.getTeacherAssignments = async function(teacherId, options = {}) {
  const query = { teacherId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.studentId) {
    query.studentId = options.studentId;
  }
  
  return await this.find(query)
    .populate('studentId', 'name email')
    .populate('teacherCertificateId')
    .populate('courseId', 'title')
    .sort({ assignedDate: -1 });
};

// Instance method to mark as viewed
studentCertificateAssignmentSchema.methods.markAsViewed = async function() {
  if (this.status === 'assigned') {
    this.status = 'viewed';
    await this.save();
  }
};

// Instance method to mark as completed
studentCertificateAssignmentSchema.methods.markAsCompleted = async function(studentNotes = '') {
  this.status = 'completed';
  this.completedAt = new Date();
  if (studentNotes) {
    this.studentNotes = studentNotes;
  }
  await this.save();
};

// Instance method to add teacher feedback
studentCertificateAssignmentSchema.methods.addTeacherFeedback = async function(feedback) {
  this.teacherFeedback = feedback;
  await this.save();
};

// Pre-save middleware to validate due date
studentCertificateAssignmentSchema.pre('save', function(next) {
  if (this.dueDate && this.assignedDate) {
    // Compare dates only (ignore time) by setting time to start of day
    const dueDateOnly = new Date(this.dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const assignedDateOnly = new Date(this.assignedDate);
    assignedDateOnly.setHours(0, 0, 0, 0);
    
    if (dueDateOnly < assignedDateOnly) {
      return next(new Error('Due date cannot be before assignment date'));
    }
  }
  next();
});

module.exports = mongoose.model('StudentCertificateAssignment', studentCertificateAssignmentSchema);

