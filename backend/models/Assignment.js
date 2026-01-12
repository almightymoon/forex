const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  maxPoints: {
    type: Number,
    required: [true, 'Maximum points are required'],
    min: [1, 'Maximum points must be at least 1'],
    max: [1000, 'Maximum points cannot exceed 1000']
  },
  passingScore: {
    type: Number,
    required: [true, 'Passing score is required'],
    min: [0, 'Passing score cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.maxPoints;
      },
      message: 'Passing score cannot exceed maximum points'
    }
  },
  assignmentType: {
    type: String,
    enum: ['essay', 'quiz', 'project', 'presentation', 'analysis', 'other'],
    default: 'essay'
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [5000, 'Instructions cannot exceed 5000 characters']
  },
  attachments: [{
    title: String,
    description: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  rubric: [{
    criterion: String,
    description: String,
    maxPoints: Number,
    weight: Number
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100%']
  },
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    files: [{
      title: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number
    }],
    textContent: String,
    status: {
      type: String,
      enum: ['submitted', 'graded', 'late'],
      default: 'submitted'
    },
    grade: {
      type: Number,
      min: [0, 'Grade cannot be negative']
    },
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: Date,
    rubricScores: [{
      criterion: String,
      points: Number,
      feedback: String
    }]
  }],
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  estimatedTime: {
    type: Number, // in minutes
    min: [1, 'Estimated time must be at least 1 minute']
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment'
  }],
  isGroupAssignment: {
    type: Boolean,
    default: false
  },
  maxGroupSize: {
    type: Number,
    min: [1, 'Maximum group size must be at least 1'],
    validate: {
      validator: function(value) {
        return !this.isGroupAssignment || value > 1;
      },
      message: 'Group assignments must have maximum group size greater than 1'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isPublished: 1 });
assignmentSchema.index({ 'submissions.student': 1 });

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions.length;
});

// Virtual for average grade
assignmentSchema.virtual('averageGrade').get(function() {
  const gradedSubmissions = this.submissions.filter(sub => sub.grade !== undefined);
  if (gradedSubmissions.length === 0) return 0;
  
  const totalGrade = gradedSubmissions.reduce((sum, sub) => sum + sub.grade, 0);
  return Math.round((totalGrade / gradedSubmissions.length) * 100) / 100;
});

// Virtual for completion rate
assignmentSchema.virtual('completionRate').get(function() {
  if (this.submissions.length === 0) return 0;
  
  const completedSubmissions = this.submissions.filter(sub => 
    sub.status === 'submitted' || sub.status === 'graded'
  );
  
  return Math.round((completedSubmissions.length / this.submissions.length) * 100);
});

// Virtual for isOverdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Method to submit assignment
assignmentSchema.methods.submitAssignment = function(studentId, submissionData) {
  const existingSubmission = this.submissions.find(
    sub => sub.student.toString() === studentId.toString()
  );
  
  if (existingSubmission) {
    // Update existing submission
    Object.assign(existingSubmission, submissionData);
    existingSubmission.submittedAt = new Date();
    
    // Check if submission is late
    if (new Date() > this.dueDate) {
      existingSubmission.status = 'late';
    }
  } else {
    // Create new submission
    const submission = {
      student: studentId,
      ...submissionData,
      submittedAt: new Date()
    };
    
    // Check if submission is late
    if (new Date() > this.dueDate) {
      submission.status = 'late';
    }
    
    this.submissions.push(submission);
  }
  
  return this.save();
};

// Method to grade submission
assignmentSchema.methods.gradeSubmission = function(studentId, gradeData) {
  const submission = this.submissions.find(
    sub => sub.student.toString() === studentId.toString()
  );
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  // Apply late penalty if applicable
  let finalGrade = gradeData.grade;
  if (submission.status === 'late' && this.latePenalty > 0) {
    const penalty = (gradeData.grade * this.latePenalty) / 100;
    finalGrade = Math.max(0, gradeData.grade - penalty);
  }
  
  submission.grade = finalGrade;
  submission.feedback = gradeData.feedback;
  submission.gradedBy = gradeData.gradedBy;
  submission.gradedAt = new Date();
  submission.status = 'graded';
  
  if (gradeData.rubricScores) {
    submission.rubricScores = gradeData.rubricScores;
  }
  
  return this.save();
};

// Method to publish assignment
assignmentSchema.methods.publish = function() {
  this.isPublished = true;
  return this.save();
};

// Method to unpublish assignment
assignmentSchema.methods.unpublish = function() {
  this.isPublished = false;
  return this.save();
};

// Pre-save middleware to validate due date
assignmentSchema.pre('save', function(next) {
  if (this.dueDate && this.dueDate <= new Date()) {
    return next(new Error('Due date must be in the future'));
  }
  next();
});

// Ensure virtuals are included when converting to JSON
assignmentSchema.set('toJSON', { virtuals: true });
assignmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
