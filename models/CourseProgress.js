const mongoose = require('mongoose');

// Individual content completion tracking
const contentCompletionSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'text', 'ppt', 'quiz', 'assignment'],
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  // For videos: watch percentage and duration
  videoProgress: {
    watchedDuration: {
      type: Number, // in seconds
      default: 0
    },
    totalDuration: {
      type: Number, // in seconds
      default: 0
    },
    watchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastWatchedAt: Date,
    watchedSegments: [{
      startTime: Number,
      endTime: Number,
      duration: Number
    }]
  },
  // For quizzes: attempt tracking
  quizAttempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      answer: String,
      isCorrect: Boolean,
      pointsEarned: Number
    }],
    score: {
      type: Number,
      min: 0
    },
    maxScore: {
      type: Number,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    passed: {
      type: Boolean,
      default: false
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    }
  }],
  // For assignments: submission tracking
  assignmentSubmission: {
    submitted: {
      type: Boolean,
      default: false
    },
    submittedAt: Date,
    grade: {
      type: Number,
      min: 0
    },
    maxGrade: {
      type: Number,
      min: 0
    },
    passed: {
      type: Boolean,
      default: false
    },
    feedback: String,
    gradedAt: Date
  },
  // For text/PPT content: reading tracking
  readingProgress: {
    timeSpent: {
      type: Number, // in seconds
      default: 0
    },
    lastReadAt: Date,
    isMarkedComplete: {
      type: Boolean,
      default: false
    },
    markedCompleteAt: Date
  }
}, { _id: true });

// Main course progress schema
const courseProgressSchema = new mongoose.Schema({
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
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  // Overall progress tracking
  overallProgress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedContent: {
      type: Number,
      default: 0
    },
    totalContent: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Detailed content completion tracking
  contentProgress: [contentCompletionSchema],
  // Certificate eligibility
  certificateEligibility: {
    isEligible: {
      type: Boolean,
      default: false
    },
    eligibilityCheckedAt: Date,
    completionCriteria: {
      videosCompleted: {
        type: Number,
        default: 0
      },
      quizzesPassed: {
        type: Number,
        default: 0
      },
      assignmentsSubmitted: {
        type: Number,
        default: 0
      },
      assignmentsPassed: {
        type: Number,
        default: 0
      },
      textContentCompleted: {
        type: Number,
        default: 0
      },
      totalRequiredContent: {
        type: Number,
        default: 0
      }
    },
    certificateIssued: {
      type: Boolean,
      default: false
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate'
    },
    certificateIssuedAt: Date
  },
  // Study analytics
  analytics: {
    totalStudyTime: {
      type: Number, // in seconds
      default: 0
    },
    averageSessionDuration: {
      type: Number, // in seconds
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    lastSessionDuration: {
      type: Number, // in seconds
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastStudyDate: Date,
    studyPattern: {
      preferredDays: [String], // ['monday', 'tuesday', etc.]
      preferredTimes: [String], // ['morning', 'afternoon', 'evening']
      averageDailyTime: Number // in seconds
    }
  },
  // Course-specific settings
  settings: {
    autoMarkComplete: {
      type: Boolean,
      default: true
    },
    requiredWatchPercentage: {
      type: Number,
      default: 90,
      min: 0,
      max: 100
    },
    notificationPreferences: {
      reminders: {
        type: Boolean,
        default: true
      },
      achievements: {
        type: Boolean,
        default: true
      },
      deadlines: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseProgressSchema.index({ student: 1, course: 1 }, { unique: true });
courseProgressSchema.index({ student: 1, 'overallProgress.percentage': -1 });
courseProgressSchema.index({ course: 1, 'overallProgress.percentage': -1 });
courseProgressSchema.index({ 'certificateEligibility.isEligible': 1 });
courseProgressSchema.index({ lastAccessed: -1 });

// Virtual for completion status
courseProgressSchema.virtual('isCompleted').get(function() {
  return this.overallProgress.percentage >= 100;
});

// Virtual for progress summary
courseProgressSchema.virtual('progressSummary').get(function() {
  const summary = {
    total: this.overallProgress.totalContent,
    completed: this.overallProgress.completedContent,
    percentage: this.overallProgress.percentage,
    videos: { total: 0, completed: 0 },
    quizzes: { total: 0, completed: 0 },
    assignments: { total: 0, completed: 0 },
    text: { total: 0, completed: 0 },
    ppt: { total: 0, completed: 0 }
  };

  this.contentProgress.forEach(content => {
    summary[content.contentType].total++;
    if (content.isCompleted) {
      summary[content.contentType].completed++;
    }
  });

  return summary;
});

// Method to update content progress
courseProgressSchema.methods.updateContentProgress = function(contentId, contentType, progressData) {
  try {
    // Ensure contentProgress array exists
    if (!this.contentProgress) {
      console.log('Initializing contentProgress array');
      this.contentProgress = [];
    }

    console.log('Looking for content progress:', {
      contentId,
      contentType,
      contentProgressLength: this.contentProgress.length,
      existingContentIds: this.contentProgress.map(cp => cp.contentId.toString())
    });

    let contentProgress = this.contentProgress.find(
      cp => cp.contentId.toString() === contentId.toString()
    );

  if (!contentProgress) {
    contentProgress = {
      contentId,
      contentType,
      isCompleted: false,
      videoProgress: {
        watchedDuration: 0,
        totalDuration: 0,
        watchPercentage: 0,
        watchedSegments: []
      },
      quizAttempts: [],
      assignmentSubmissions: []
    };
    this.contentProgress.push(contentProgress);
  }

  // Update based on content type
  switch (contentType) {
    case 'video':
      if (progressData.watchedDuration && progressData.totalDuration) {
        contentProgress.videoProgress.watchedDuration = progressData.watchedDuration;
        contentProgress.videoProgress.totalDuration = progressData.totalDuration;
        contentProgress.videoProgress.watchPercentage = Math.round(
          (progressData.watchedDuration / progressData.totalDuration) * 100
        );
        contentProgress.videoProgress.lastWatchedAt = new Date();
        
        // Mark as completed if watch percentage meets requirement
        const requiredPercentage = this.settings.requiredWatchPercentage;
        if (contentProgress.videoProgress.watchPercentage >= requiredPercentage) {
          contentProgress.isCompleted = true;
          contentProgress.completedAt = new Date();
        }
      }
      break;

    case 'quiz':
      if (progressData.attempt) {
        contentProgress.quizAttempts.push(progressData.attempt);
        
        // Check if quiz is passed (assuming 70% passing score)
        const passingScore = 70;
        if (progressData.attempt.percentage >= passingScore) {
          contentProgress.isCompleted = true;
          contentProgress.completedAt = new Date();
        }
      }
      break;

    case 'assignment':
      if (progressData.submission) {
        contentProgress.assignmentSubmission = progressData.submission;
        
        // Mark as completed if submitted and passed
        if (progressData.submission.submitted && progressData.submission.passed) {
          contentProgress.isCompleted = true;
          contentProgress.completedAt = new Date();
        }
      }
      break;

    case 'text':
    case 'ppt':
      if (progressData.markedComplete) {
        contentProgress.readingProgress.isMarkedComplete = true;
        contentProgress.readingProgress.markedCompleteAt = new Date();
        contentProgress.isCompleted = true;
        contentProgress.completedAt = new Date();
      }
      if (progressData.timeSpent) {
        contentProgress.readingProgress.timeSpent += progressData.timeSpent;
        contentProgress.readingProgress.lastReadAt = new Date();
      }
      break;
  }

    this.lastAccessed = new Date();
    this.updateOverallProgress();
    
    return this.save();
  } catch (error) {
    console.error('Error in updateContentProgress:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      contentId,
      contentType,
      progressData
    });
    throw error;
  }
};

// Method to update overall progress
courseProgressSchema.methods.updateOverallProgress = function() {
  const completedContent = this.contentProgress.filter(cp => cp.isCompleted).length;
  const totalContent = this.contentProgress.length;
  
  this.overallProgress.completedContent = completedContent;
  this.overallProgress.totalContent = totalContent;
  this.overallProgress.percentage = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0;
  this.overallProgress.lastUpdated = new Date();
  
  // Check certificate eligibility
  this.checkCertificateEligibility();
};

// Method to check certificate eligibility
courseProgressSchema.methods.checkCertificateEligibility = function() {
  const criteria = {
    videosCompleted: 0,
    quizzesPassed: 0,
    assignmentsSubmitted: 0,
    assignmentsPassed: 0,
    textContentCompleted: 0,
    totalRequiredContent: 0
  };

  this.contentProgress.forEach(content => {
    criteria.totalRequiredContent++;
    
    switch (content.contentType) {
      case 'video':
        if (content.isCompleted) criteria.videosCompleted++;
        break;
      case 'quiz':
        if (content.isCompleted) criteria.quizzesPassed++;
        break;
      case 'assignment':
        if (content.assignmentSubmission.submitted) {
          criteria.assignmentsSubmitted++;
          if (content.assignmentSubmission.passed) {
            criteria.assignmentsPassed++;
          }
        }
        break;
      case 'text':
      case 'ppt':
        if (content.isCompleted) criteria.textContentCompleted++;
        break;
    }
  });

  this.certificateEligibility.completionCriteria = criteria;
  
  // Check if eligible (80% completion + all assignments passed)
  const completionPercentage = (this.overallProgress.percentage >= 80);
  const allAssignmentsPassed = criteria.assignmentsSubmitted === criteria.assignmentsPassed;
  
  this.certificateEligibility.isEligible = completionPercentage && allAssignmentsPassed;
  this.certificateEligibility.eligibilityCheckedAt = new Date();
};

// Method to mark content as completed manually
courseProgressSchema.methods.markContentComplete = function(contentId, contentType) {
  return this.updateContentProgress(contentId, contentType, {
    markedComplete: true
  });
};

// Method to get detailed progress report
courseProgressSchema.methods.getDetailedProgress = function() {
  const progress = {
    student: this.student,
    course: this.course,
    enrolledAt: this.enrolledAt,
    lastAccessed: this.lastAccessed,
    overallProgress: this.overallProgress,
    certificateEligibility: this.certificateEligibility,
    analytics: this.analytics,
    contentProgress: this.contentProgress || [], // Include the contentProgress array
    contentBreakdown: {}
  };

  // Group content by type
  ['video', 'quiz', 'assignment', 'text', 'ppt'].forEach(type => {
    progress.contentBreakdown[type] = {
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      items: []
    };
  });

  this.contentProgress.forEach(content => {
    const breakdown = progress.contentBreakdown[content.contentType];
    breakdown.total++;
    
    if (content.isCompleted) {
      breakdown.completed++;
    } else {
      // Check if in progress
      const hasProgress = (content.videoProgress.watchPercentage > 0) ||
                         (content.quizAttempts.length > 0) ||
                         (content.assignmentSubmission.submitted) ||
                         (content.readingProgress.timeSpent > 0);
      
      if (hasProgress) {
        breakdown.inProgress++;
      } else {
        breakdown.notStarted++;
      }
    }
    
    breakdown.items.push({
      contentId: content.contentId,
      isCompleted: content.isCompleted,
      completedAt: content.completedAt,
      progress: content
    });
  });

  return progress;
};

// Static method to initialize course progress for a student
courseProgressSchema.statics.initializeProgress = async function(studentId, courseId, courseContent) {
  // Check if progress already exists
  let progress = await this.findOne({ student: studentId, course: courseId });
  
  if (progress) {
    return progress;
  }

  // Create new progress record
  progress = new this({
    student: studentId,
    course: courseId,
    contentProgress: []
  });

  // Initialize content progress for all course content
  if (courseContent && courseContent.length > 0) {
    courseContent.forEach(content => {
      progress.contentProgress.push({
        contentId: content._id,
        contentType: content.type,
        isCompleted: false,
        videoProgress: {
          watchedDuration: 0,
          totalDuration: 0,
          watchPercentage: 0,
          watchedSegments: []
        },
        quizAttempts: [],
        assignmentSubmissions: []
      });
    });
  }

  progress.updateOverallProgress();
  return await progress.save();
};

module.exports = mongoose.model('CourseProgress', courseProgressSchema);