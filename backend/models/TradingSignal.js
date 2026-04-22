const mongoose = require('mongoose');

const tradingSignalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'SIGNAL'
  },
  instrumentType: {
    type: String,
    required: [true, 'Instrument type is required'],
    enum: ['forex', 'crypto', 'stocks', 'commodities', 'indices', 'futures'],
    default: 'forex'
  },
  type: {
    type: String,
    required: [true, 'Signal type is required'],
    enum: ['buy', 'sell', 'hold', 'strong_buy', 'strong_sell'],
    lowercase: true
  },
  // Current market prices (like MT5 quotes)
  currentBid: {
    type: Number,
    min: [0, 'Bid price cannot be negative'],
    default: 0
  },
  currentAsk: {
    type: Number,
    min: [0, 'Ask price cannot be negative'],
    default: 0
  },
  // Daily high/low (like MT5 H:/L:)
  dailyHigh: {
    type: Number,
    min: [0, 'Daily high cannot be negative'],
    default: 0
  },
  dailyLow: {
    type: Number,
    min: [0, 'Daily low cannot be negative'],
    default: 0
  },
  // Price change (like MT5 change display)
  priceChange: {
    type: Number,
    default: 0
  },
  priceChangePercent: {
    type: Number,
    default: 0
  },
  // Signal entry/exit prices
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
    min: [0, 'Entry price cannot be negative']
  },
  // Multi-target support (teacher can set many targets).
  // We keep `targetPrice` for backward compatibility as the first target.
  targets: {
    type: [Number],
    default: undefined,
    validate: {
      validator: function (arr) {
        if (arr == null) return true;
        if (!Array.isArray(arr)) return false;
        return arr.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);
      },
      message: 'Targets must be an array of non-negative numbers'
    }
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
  // Risk management
  riskRewardRatio: {
    type: Number,
    min: [0, 'Risk-reward ratio cannot be negative']
  },
  positionSize: {
    type: Number,
    min: [0, 'Position size cannot be negative']
  },
  maxRisk: {
    type: Number,
    min: [0, 'Maximum risk cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  timeframe: {
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
    default: '1h'
  },
  confidence: {
    type: Number,
    min: [1, 'Confidence must be at least 1%'],
    max: [100, 'Confidence cannot exceed 100%'],
    default: 50
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
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
tradingSignalSchema.index({ teacher: 1 });
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

// Pre-save middleware to validate prices and market data
tradingSignalSchema.pre('save', function(next) {
  // Normalize multi-targets → ensure targetPrice mirrors the first target (if provided)
  if (Array.isArray(this.targets) && this.targets.length > 0) {
    const first = this.targets.find((n) => typeof n === 'number' && Number.isFinite(n));
    if (typeof first === 'number') this.targetPrice = first;
  } else if (typeof this.targetPrice === 'number' && Number.isFinite(this.targetPrice)) {
    // Keep `targets` in sync for legacy clients
    this.targets = [this.targetPrice];
  }

  // If market snapshot isn't provided, default it to sane values derived from entry.
  const hasMarketSnapshot =
    Number(this.currentBid) > 0 &&
    Number(this.currentAsk) > 0 &&
    Number(this.dailyHigh) > 0 &&
    Number(this.dailyLow) > 0;
  if (!hasMarketSnapshot && Number(this.entryPrice) > 0) {
    const entry = Number(this.entryPrice);
    const spread = Math.max(entry * 0.0002, 0.0001);
    const bid = entry;
    const ask = entry + spread;
    this.currentBid = bid;
    this.currentAsk = ask;
    this.dailyHigh = Math.max(ask, entry * 1.01);
    this.dailyLow = Math.min(bid, entry * 0.99);
    this.priceChange = ask - bid;
    this.priceChangePercent = bid > 0 ? ((ask - bid) / bid) * 100 : 0;
  }

  // Validate bid/ask relationship only when both are present
  if (Number(this.currentBid) > 0 && Number(this.currentAsk) > 0 && this.currentBid >= this.currentAsk) {
    return next(new Error('Bid price must be lower than ask price'));
  }

  // Validate daily high/low only when both are present
  if (Number(this.dailyLow) > 0 && Number(this.dailyHigh) > 0 && this.dailyLow >= this.dailyHigh) {
    return next(new Error('Daily low must be lower than daily high'));
  }

  // Validate current prices are within daily range only when we have all four
  if (
    Number(this.currentBid) > 0 &&
    Number(this.currentAsk) > 0 &&
    Number(this.dailyLow) > 0 &&
    Number(this.dailyHigh) > 0
  ) {
    if (this.currentBid < this.dailyLow * 0.8 || this.currentAsk > this.dailyHigh * 1.2) {
      return next(
        new Error(
          'Current prices should be reasonably within daily high/low range (allowing 20% tolerance for market volatility and news events)'
        )
      );
    }
  }
  
  // Validate signal prices based on type
  if (this.type === 'buy' || this.type === 'strong_buy') {
    if (this.targetPrice <= this.entryPrice) {
      return next(new Error('Target price must be higher than entry price for buy signals'));
    }
    if (this.stopLoss >= this.entryPrice) {
      return next(new Error('Stop loss must be lower than entry price for buy signals'));
    }
  } else if (this.type === 'sell' || this.type === 'strong_sell') {
    if (this.targetPrice >= this.entryPrice) {
      return next(new Error('Target price must be lower than entry price for sell signals'));
    }
    if (this.stopLoss <= this.entryPrice) {
      return next(new Error('Stop loss must be higher than entry price for sell signals'));
    }
  }
  
  // Calculate and validate risk-reward ratio
  if (this.entryPrice && this.targetPrice && this.stopLoss) {
    const risk = Math.abs(this.entryPrice - this.stopLoss);
    const reward = Math.abs(this.targetPrice - this.entryPrice);
    if (risk > 0) {
      this.riskRewardRatio = reward / risk;
    }
  }
  
  next();
});

// Ensure virtuals are included when converting to JSON
tradingSignalSchema.set('toJSON', { virtuals: true });
tradingSignalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TradingSignal', tradingSignalSchema);
