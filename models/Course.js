const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true,
    maxlength: [100, 'Content title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Content description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Content type is required'],
    enum: ['video', 'text', 'ppt', 'quiz', 'assignment']
  },
  order: {
    type: Number,
    required: [true, 'Content order is required'],
    min: [1, 'Content order must be at least 1']
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number, // in seconds, for videos
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  // Video specific fields
  videoUrl: {
    type: String,
    required: function() { return this.type === 'video'; }
  },
  thumbnail: {
    type: String
  },
  // Text content fields
  textContent: {
    type: String,
    required: function() { return this.type === 'text'; }
  },
  // PPT fields
  pptUrl: {
    type: String,
    required: function() { return this.type === 'ppt'; }
  },
  pptSlides: {
    type: Number,
    default: 0
  },
  // Quiz fields
  quizQuestions: [{
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer'],
      default: 'multiple_choice'
    },
    options: [String],
    correctAnswer: {
      type: String,
      required: true
    },
    explanation: String,
    points: {
      type: Number,
      default: 1
    }
  }],
  totalPoints: {
    type: Number,
    default: 0
  },
  passingScore: {
    type: Number,
    default: 70
  }
}, { _id: true });

// Legacy video schema for backward compatibility
const videoSchema = contentSchema;

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Course title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    maxlength: [2000, 'Course description cannot exceed 2000 characters']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Course price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'PKR', 'EUR']
  },
  thumbnail: {
    type: String,
    required: [true, 'Course thumbnail is required']
  },
  content: [contentSchema],
  videos: [videoSchema], // Keep for backward compatibility
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: ['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general']
  },
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['beginner', 'intermediate', 'advanced']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalRatings: {
    type: Number,
    default: 0,
    min: [0, 'Total ratings cannot be negative']
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    },
    completedVideos: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  totalStudents: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'English',
    enum: ['English', 'Urdu', 'Arabic']
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: [200, 'Requirement cannot exceed 200 characters']
  }],
  learningOutcomes: [{
    type: String,
    trim: true,
    maxlength: [200, 'Learning outcome cannot exceed 200 characters']
  }],
  certificate: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    minProgress: {
      type: Number,
      default: 80,
      min: [0, 'Minimum progress cannot be negative'],
      max: [100, 'Minimum progress cannot exceed 100']
    }
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total duration
courseSchema.virtual('totalDuration').get(function() {
  const videoContent = this.content ? this.content.filter(c => c.type === 'video') : [];
  const legacyVideos = this.videos || [];
  const allVideos = [...videoContent, ...legacyVideos];
  return allVideos.reduce((total, video) => total + (video.duration || 0), 0);
});

// Virtual for total content count
courseSchema.virtual('totalContent').get(function() {
  return this.content ? this.content.length : 0;
});

// Virtual for total videos count (backward compatibility)
courseSchema.virtual('totalVideos').get(function() {
  const videoContent = this.content ? this.content.filter(c => c.type === 'video') : [];
  const legacyVideos = this.videos || [];
  return videoContent.length + legacyVideos.length;
});

// Virtual for average rating
courseSchema.virtual('averageRating').get(function() {
  return this.totalRatings > 0 ? (this.rating / this.totalRatings).toFixed(1) : 0;
});

// Virtual for formatted price
courseSchema.virtual('formattedPrice').get(function() {
  return `${this.currency} ${this.price.toFixed(2)}`;
});

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ isFeatured: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ totalStudents: -1 });

// Pre-save middleware to update total students count
courseSchema.pre('save', function(next) {
  this.totalStudents = this.enrolledStudents.length;
  next();
});

// Method to enroll a student
courseSchema.methods.enrollStudent = function(studentId) {
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (!existingEnrollment) {
    this.enrolledStudents.push({
      student: studentId,
      enrolledAt: new Date(),
      progress: 0,
      completedVideos: [],
      lastAccessed: new Date()
    });
    this.totalStudents = this.enrolledStudents.length;
  }
  
  return this;
};

// Method to update student progress
courseSchema.methods.updateStudentProgress = function(studentId, contentId, progress) {
  const enrollment = this.enrolledStudents.find(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
  
  if (enrollment) {
    if (!enrollment.completedVideos.includes(contentId)) {
      enrollment.completedVideos.push(contentId);
    }
    
    // Calculate progress based on total content
    const totalContent = this.content ? this.content.length : this.videos.length;
    enrollment.progress = Math.min(100, (enrollment.completedVideos.length / totalContent) * 100);
    enrollment.lastAccessed = new Date();
  }
  
  return this;
};

// Method to calculate course rating
courseSchema.methods.calculateRating = function() {
  // This would typically be called from a review/rating system
  // For now, it's a placeholder
  return this;
};

module.exports = mongoose.model('Course', courseSchema);
