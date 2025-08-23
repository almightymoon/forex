const mongoose = require('mongoose');

const tradingSignalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: [true, 'Trading symbol is required'],
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: [true, 'Signal type is required'],
    enum: ['buy', 'sell', 'hold'],
    lowercase: true
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price cannot be negative']
  },
  targetPrice: {
    type: Number,
    required: [true, 'Target price is required'],
    min: [0, 'Target price cannot be negative']
  },
  stopLoss: {
    type: Number,
    required: [true, 'Stop loss is required'],
    min: [0, 'Stop loss cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Signal description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  timeframe: {
    type: String,
    required: [true, 'Timeframe is required'],
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence level is required'],
    min: [1, 'Confidence must be at least 1%'],
    max: [100, 'Confidence cannot exceed 100%']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'expired'],
    default: 'active'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expectedReturn: {
    type: Number,
    min: [0, 'Expected return cannot be negative']
  },
  marketConditions: {
    type: String,
    enum: ['bullish', 'bearish', 'sideways', 'volatile'],
    default: 'sideways'
  },
  technicalIndicators: [{
    name: String,
    value: String,
    signal: String
  }],
  fundamentalFactors: [{
    factor: String,
    impact: String
  }],
  newsEvents: [{
    event: String,
    date: Date,
    impact: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
tradingSignalSchema.index({ symbol: 1, type: 1 });
tradingSignalSchema.index({ instructor: 1 });
tradingSignalSchema.index({ status: 1 });
tradingSignalSchema.index({ createdAt: -1 });
tradingSignalSchema.index({ isPublished: 1 });

// Virtual for comment count
tradingSignalSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
tradingSignalSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to add comment
tradingSignalSchema.methods.addComment = function(userId, text) {
  this.comments.push({
    user: userId,
    text: text
  });
  return this.save();
};

// Method to toggle like
tradingSignalSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(likeIndex, 1);
  }
  return this.save();
};

// Method to increment views
tradingSignalSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to close signal
tradingSignalSchema.methods.closeSignal = function() {
  this.status = 'closed';
  return this.save();
};

// Method to expire signal
tradingSignalSchema.methods.expireSignal = function() {
  this.status = 'expired';
  return this.save();
};

// Pre-save middleware to validate prices
tradingSignalSchema.pre('save', function(next) {
  if (this.type === 'buy') {
    if (this.targetPrice <= this.entryPrice) {
      return next(new Error('Target price must be higher than entry price for buy signals'));
    }
    if (this.stopLoss >= this.entryPrice) {
      return next(new Error('Stop loss must be lower than entry price for buy signals'));
    }
  } else if (this.type === 'sell') {
    if (this.targetPrice >= this.entryPrice) {
      return next(new Error('Target price must be lower than entry price for sell signals'));
    }
    if (this.stopLoss <= this.entryPrice) {
      return next(new Error('Stop loss must be higher than entry price for sell signals'));
    }
  }
  next();
});

// Ensure virtuals are included when converting to JSON
tradingSignalSchema.set('toJSON', { virtuals: true });
tradingSignalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TradingSignal', tradingSignalSchema);
