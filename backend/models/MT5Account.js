const mongoose = require('mongoose');

const mt5AccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },
  // MT5 Account credentials
  mt5Login: {
    type: Number,
    required: [true, 'MT5 login is required'],
    unique: true
    // Index is created automatically by unique: true, but we also define it explicitly below
  },
  mt5Password: {
    type: String,
    required: [true, 'MT5 password is required']
  },
  mt5Server: {
    type: String,
    required: [true, 'MT5 server is required']
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastConnection: {
    type: Date
  },
  // Account information (cached)
  accountInfo: {
    balance: Number,
    equity: Number,
    margin: Number,
    freeMargin: Number,
    marginLevel: Number,
    currency: String,
    leverage: Number,
    server: String,
    company: String
  },
  // Copy trading settings
  copyTradingEnabled: {
    type: Boolean,
    default: false
  },
  copyTradingSettings: {
    maxRiskPercent: {
      type: Number,
      default: 2,
      min: 0.1,
      max: 10
    },
    maxDailyLoss: {
      type: Number,
      default: 0
    },
    maxDailyLossPercent: {
      type: Number,
      default: 5,
      min: 1,
      max: 50
    },
    minBalance: {
      type: Number,
      default: 0
    },
    symbols: [{
      type: String
    }],
    excludeSymbols: [{
      type: String
    }],
    multiplier: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 10
    }
  },
  // Risk management
  riskSettings: {
    maxPositionSize: {
      type: Number,
      default: 10
    },
    maxDailyTrades: {
      type: Number,
      default: 50
    },
    maxSpread: {
      type: Number,
      default: 0
    }
  },
  // Statistics
  statistics: {
    totalTrades: {
      type: Number,
      default: 0
    },
    winningTrades: {
      type: Number,
      default: 0
    },
    losingTrades: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    totalLoss: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    averageProfit: {
      type: Number,
      default: 0
    },
    averageLoss: {
      type: Number,
      default: 0
    },
    profitFactor: {
      type: Number,
      default: 0
    }
  },
  // Connection metadata
  connectionMetadata: {
    ipAddress: String,
    userAgent: String,
    lastSync: Date
  }
}, {
  timestamps: true
});

// Indexes (user index is created by unique: true on user field)
// Index already created by unique: true on mt5Login field
// mt5AccountSchema.index({ mt5Login: 1 });
mt5AccountSchema.index({ isActive: 1 });
mt5AccountSchema.index({ copyTradingEnabled: 1 });

// Methods
mt5AccountSchema.methods.updateAccountInfo = function(accountInfo) {
  this.accountInfo = {
    balance: accountInfo.balance,
    equity: accountInfo.equity,
    margin: accountInfo.margin,
    freeMargin: accountInfo.freeMargin,
    marginLevel: accountInfo.marginLevel,
    currency: accountInfo.currency,
    leverage: accountInfo.leverage,
    server: accountInfo.server,
    company: accountInfo.company
  };
  this.lastConnection = new Date();
  return this.save();
};

mt5AccountSchema.methods.updateStatistics = function(tradeResult) {
  this.statistics.totalTrades += 1;
  
  if (tradeResult.profit > 0) {
    this.statistics.winningTrades += 1;
    this.statistics.totalProfit += tradeResult.profit;
  } else {
    this.statistics.losingTrades += 1;
    this.statistics.totalLoss += Math.abs(tradeResult.profit);
  }
  
  // Calculate win rate
  if (this.statistics.totalTrades > 0) {
    this.statistics.winRate = (this.statistics.winningTrades / this.statistics.totalTrades) * 100;
  }
  
  // Calculate averages
  if (this.statistics.winningTrades > 0) {
    this.statistics.averageProfit = this.statistics.totalProfit / this.statistics.winningTrades;
  }
  
  if (this.statistics.losingTrades > 0) {
    this.statistics.averageLoss = this.statistics.totalLoss / this.statistics.losingTrades;
  }
  
  // Calculate profit factor
  if (this.statistics.totalLoss > 0) {
    this.statistics.profitFactor = this.statistics.totalProfit / this.statistics.totalLoss;
  }
  
  return this.save();
};

mt5AccountSchema.methods.canPlaceTrade = function(symbol, volume) {
  // Check if account is active
  if (!this.isActive || !this.isVerified) {
    return { allowed: false, reason: 'Account is not active or verified' };
  }
  
  // Check daily trade limit
  if (this.statistics.totalTrades >= this.riskSettings.maxDailyTrades) {
    return { allowed: false, reason: 'Daily trade limit reached' };
  }
  
  // Check position size limit
  if (volume > this.riskSettings.maxPositionSize) {
    return { allowed: false, reason: 'Position size exceeds maximum allowed' };
  }
  
  // Check copy trading settings
  if (this.copyTradingEnabled) {
    if (this.copyTradingSettings.excludeSymbols.includes(symbol)) {
      return { allowed: false, reason: 'Symbol is excluded from copy trading' };
    }
    
    if (this.copyTradingSettings.symbols.length > 0 && 
        !this.copyTradingSettings.symbols.includes(symbol)) {
      return { allowed: false, reason: 'Symbol is not in allowed list' };
    }
  }
  
  return { allowed: true };
};

// Virtual for net profit
mt5AccountSchema.virtual('netProfit').get(function() {
  return this.statistics.totalProfit - this.statistics.totalLoss;
});

// Ensure virtuals are included when converting to JSON
mt5AccountSchema.set('toJSON', { virtuals: true });
mt5AccountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MT5Account', mt5AccountSchema);

