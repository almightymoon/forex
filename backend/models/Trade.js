const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    index: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'pending', 'cancelled'],
    default: 'open',
    index: true
  },
  // Entry details
  entryPrice: {
    type: Number,
    required: true
  },
  lotSize: {
    type: Number,
    required: true,
    min: 0.01
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  // Exit details
  exitPrice: {
    type: Number
  },
  exitTime: {
    type: Date
  },
  // Risk management
  stopLoss: {
    type: Number
  },
  takeProfit: {
    type: Number
  },
  // Financial details
  profitLoss: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  swap: {
    type: Number,
    default: 0
  },
  netProfitLoss: {
    type: Number,
    default: 0
  },
  // Additional info
  notes: {
    type: String,
    trim: true
  },
  leverage: {
    type: Number,
    default: 1
  },
  margin: {
    type: Number
  },
  // Metadata
  platform: {
    type: String,
    default: 'web'
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });

// Virtual for duration
tradeSchema.virtual('duration').get(function() {
  if (this.exitTime) {
    return this.exitTime - this.entryTime;
  }
  return Date.now() - this.entryTime;
});

// Method to close trade
tradeSchema.methods.close = function(exitPrice, notes) {
  this.exitPrice = exitPrice;
  this.exitTime = new Date();
  this.status = 'closed';
  
  // Calculate profit/loss
  const priceDiff = this.type === 'buy' 
    ? (exitPrice - this.entryPrice)
    : (this.entryPrice - exitPrice);
  
  // Assuming 1 lot = 100,000 units (standard forex lot)
  const lotValue = 100000;
  this.profitLoss = priceDiff * this.lotSize * lotValue;
  
  // Calculate net P/L after commission and swap
  this.netProfitLoss = this.profitLoss - this.commission - this.swap;
  
  if (notes) {
    this.notes = this.notes ? `${this.notes}\n${notes}` : notes;
  }
  
  return this.save();
};

// Method to update stop loss
tradeSchema.methods.updateStopLoss = function(newStopLoss) {
  this.stopLoss = newStopLoss;
  return this.save();
};

// Method to update take profit
tradeSchema.methods.updateTakeProfit = function(newTakeProfit) {
  this.takeProfit = newTakeProfit;
  return this.save();
};

// Static method to get user's trading statistics
tradeSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), status: 'closed' } },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        winningTrades: {
          $sum: { $cond: [{ $gt: ['$netProfitLoss', 0] }, 1, 0] }
        },
        losingTrades: {
          $sum: { $cond: [{ $lt: ['$netProfitLoss', 0] }, 1, 0] }
        },
        totalProfit: {
          $sum: { $cond: [{ $gt: ['$netProfitLoss', 0] }, '$netProfitLoss', 0] }
        },
        totalLoss: {
          $sum: { $cond: [{ $lt: ['$netProfitLoss', 0] }, '$netProfitLoss', 0] }
        },
        netProfitLoss: { $sum: '$netProfitLoss' },
        avgProfitLoss: { $avg: '$netProfitLoss' },
        largestWin: { $max: '$netProfitLoss' },
        largestLoss: { $min: '$netProfitLoss' }
      }
    }
  ]);
  
  const openTrades = await this.countDocuments({ user: userId, status: 'open' });
  
  if (stats.length === 0) {
    return {
      totalTrades: 0,
      openTrades,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfitLoss: 0,
      avgProfitLoss: 0,
      largestWin: 0,
      largestLoss: 0
    };
  }
  
  const result = stats[0];
  return {
    totalTrades: result.totalTrades,
    openTrades,
    winningTrades: result.winningTrades,
    losingTrades: result.losingTrades,
    winRate: result.totalTrades > 0 ? (result.winningTrades / result.totalTrades) * 100 : 0,
    totalProfit: result.totalProfit,
    totalLoss: result.totalLoss,
    netProfitLoss: result.netProfitLoss,
    avgProfitLoss: result.avgProfitLoss,
    largestWin: result.largestWin,
    largestLoss: result.largestLoss
  };
};

module.exports = mongoose.model('Trade', tradeSchema);
