const mongoose = require('mongoose');

const mt5TradeSchema = new mongoose.Schema({
  // MT5 Account reference
  mt5Account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MT5Account',
    required: [true, 'MT5 account is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  // MT5 Order information
  mt5Ticket: {
    type: Number,
    required: [true, 'MT5 ticket is required'],
    unique: true
  },
  mt5Login: {
    type: Number,
    required: [true, 'MT5 login is required']
  },
  // Trade details
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    uppercase: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP'],
    required: [true, 'Order type is required']
  },
  volume: {
    type: Number,
    required: [true, 'Volume is required'],
    min: [0.01, 'Volume must be at least 0.01']
  },
  openPrice: {
    type: Number,
    required: [true, 'Open price is required']
  },
  currentPrice: {
    type: Number
  },
  stopLoss: {
    type: Number,
    default: 0
  },
  takeProfit: {
    type: Number,
    default: 0
  },
  // Trade status
  status: {
    type: String,
    enum: ['open', 'closed', 'pending', 'cancelled', 'modified'],
    default: 'open'
  },
  // Profit/Loss
  profit: {
    type: Number,
    default: 0
  },
  swap: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  // Timestamps
  openTime: {
    type: Date,
    required: [true, 'Open time is required']
  },
  closeTime: {
    type: Date
  },
  closePrice: {
    type: Number
  },
  // Trade metadata
  comment: {
    type: String,
    default: ''
  },
  // Copy trading reference
  isCopyTrade: {
    type: Boolean,
    default: false
  },
  sourceSignal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingSignal'
  },
  sourceAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MT5Account'
  },
  // Risk management
  riskAmount: {
    type: Number
  },
  riskPercent: {
    type: Number
  },
  // Additional metadata
  metadata: {
    slippage: Number,
    spread: Number,
    magicNumber: Number,
    expiration: Date
  }
}, {
  timestamps: true
});

// Indexes
mt5TradeSchema.index({ mt5Account: 1, status: 1 });
mt5TradeSchema.index({ user: 1 });
// Index already created by unique: true on mt5Ticket field
// mt5TradeSchema.index({ mt5Ticket: 1 });
mt5TradeSchema.index({ symbol: 1, status: 1 });
mt5TradeSchema.index({ openTime: -1 });
mt5TradeSchema.index({ isCopyTrade: 1 });
mt5TradeSchema.index({ sourceSignal: 1 });

// Virtual for net profit (profit + swap - commission)
mt5TradeSchema.virtual('netProfit').get(function() {
  return this.profit + this.swap - this.commission;
});

// Virtual for profit percentage
mt5TradeSchema.virtual('profitPercent').get(function() {
  if (!this.riskAmount || this.riskAmount === 0) return 0;
  return (this.netProfit / this.riskAmount) * 100;
});

// Methods
mt5TradeSchema.methods.close = function(closePrice, closeTime) {
  this.status = 'closed';
  this.closePrice = closePrice;
  this.closeTime = closeTime || new Date();
  return this.save();
};

mt5TradeSchema.methods.updateProfit = function(currentPrice) {
  this.currentPrice = currentPrice;
  
  if (this.type === 'BUY') {
    this.profit = (currentPrice - this.openPrice) * this.volume * 100000;
  } else if (this.type === 'SELL') {
    this.profit = (this.openPrice - currentPrice) * this.volume * 100000;
  }
  
  return this.save();
};

// Ensure virtuals are included when converting to JSON
mt5TradeSchema.set('toJSON', { virtuals: true });
mt5TradeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MT5Trade', mt5TradeSchema);

