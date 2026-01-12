const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [100, 'Session title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Session description is required'],
    trim: true,
    maxlength: [1000, 'Session description cannot exceed 1000 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Session schedule is required']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Session duration is required'],
    min: [15, 'Session duration must be at least 15 minutes'],
    max: [480, 'Session duration cannot exceed 8 hours']
  },
  maxParticipants: {
    type: Number,
    default: 100,
    min: [1, 'Maximum participants must be at least 1']
  },
  currentParticipants: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    },
    joinedAt: Date,
    leftAt: Date,
    totalWatchTime: {
      type: Number, // in minutes
      default: 0
    }
  }],
  meetingLink: {
    type: String,
    trim: true
  },
  recordingUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'PKR', 'EUR']
  },
  isFree: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    required: [true, 'Session category is required'],
    enum: ['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general', 'qa']
  },
  level: {
    type: String,
    required: [true, 'Session level is required'],
    enum: ['beginner', 'intermediate', 'advanced', 'all']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  topics: [{
    type: String,
    trim: true,
    maxlength: [100, 'Topic cannot exceed 100 characters']
  }],
  materials: [{
    title: String,
    description: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  chatEnabled: {
    type: Boolean,
    default: true
  },
  recordingEnabled: {
    type: Boolean,
    default: true
  },
  isReplayAvailable: {
    type: Boolean,
    default: true
  },
  replayExpiry: {
    type: Date
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for current participant count
liveSessionSchema.virtual('participantCount').get(function() {
  return this.currentParticipants.length;
});

// Virtual for available spots
liveSessionSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.maxParticipants - this.currentParticipants.length);
});

// Virtual for isFull
liveSessionSchema.virtual('isFull').get(function() {
  return this.currentParticipants.length >= this.maxParticipants;
});

// Virtual for isUpcoming
liveSessionSchema.virtual('isUpcoming').get(function() {
  return this.status === 'scheduled' && new Date() < this.scheduledAt;
});

// Virtual for isLive
liveSessionSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

// Virtual for isCompleted
liveSessionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for formatted price
liveSessionSchema.virtual('formattedPrice').get(function() {
  if (this.isFree) return 'Free';
  return `${this.currency} ${this.price.toFixed(2)}`;
});

// Virtual for formatted duration
liveSessionSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Indexes for better query performance
liveSessionSchema.index({ teacher: 1 });
liveSessionSchema.index({ scheduledAt: 1 });
liveSessionSchema.index({ status: 1 });
liveSessionSchema.index({ category: 1 });
liveSessionSchema.index({ level: 1 });
liveSessionSchema.index({ isFree: 1 });
liveSessionSchema.index({ 'currentParticipants.student': 1 });

// Pre-save middleware to set isFree based on price
liveSessionSchema.pre('save', function(next) {
  this.isFree = this.price === 0;
  next();
});

// Method to book a student
liveSessionSchema.methods.bookStudent = function(studentId) {
  const existingBooking = this.currentParticipants.find(
    participant => participant.student.toString() === studentId.toString()
  );
  
  if (!existingBooking && !this.isFull) {
    this.currentParticipants.push({
      student: studentId,
      bookedAt: new Date(),
      attended: false
    });
    return true;
  }
  
  return false;
};

// Method to cancel student booking
liveSessionSchema.methods.cancelBooking = function(studentId) {
  const participantIndex = this.currentParticipants.findIndex(
    participant => participant.student.toString() === studentId.toString()
  );
  
  if (participantIndex !== -1) {
    this.currentParticipants.splice(participantIndex, 1);
    return true;
  }
  
  return false;
};

// Method to mark student attendance
liveSessionSchema.methods.markAttendance = function(studentId, joinedAt, leftAt, watchTime) {
  const participant = this.currentParticipants.find(
    participant => participant.student.toString() === studentId.toString()
  );
  
  if (participant) {
    participant.attended = true;
    participant.joinedAt = joinedAt || new Date();
    participant.leftAt = leftAt;
    participant.totalWatchTime = (participant.totalWatchTime || 0) + (watchTime || 0);
    return true;
  }
  
  return false;
};

// Method to start session
liveSessionSchema.methods.startSession = function() {
  if (this.status === 'scheduled' && new Date() >= this.scheduledAt) {
    this.status = 'live';
    return true;
  }
  return false;
};

// Method to end session
liveSessionSchema.methods.endSession = function() {
  if (this.status === 'live') {
    this.status = 'completed';
    return true;
  }
  return false;
};

// Static method to find upcoming sessions
liveSessionSchema.statics.findUpcoming = function() {
  return this.find({
    status: 'scheduled',
    scheduledAt: { $gt: new Date() }
  }).sort({ scheduledAt: 1 });
};

// Static method to find live sessions
liveSessionSchema.statics.findLive = function() {
  return this.find({ status: 'live' });
};

// Static method to find sessions by teacher
liveSessionSchema.statics.findByTeacher = function(teacherId) {
  return this.find({ teacher: teacherId }).sort({ scheduledAt: -1 });
};

module.exports = mongoose.model('LiveSession', liveSessionSchema);
