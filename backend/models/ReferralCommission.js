const mongoose = require('mongoose');

const referralCommissionSchema = new mongoose.Schema({
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  purchaser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  purchaseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'PKR', 'EUR', 'GBP'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidAt: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes
referralCommissionSchema.index({ payment: 1 });
referralCommissionSchema.index({ purchaser: 1 });
referralCommissionSchema.index({ referrer: 1 });
referralCommissionSchema.index({ status: 1 });
referralCommissionSchema.index({ createdAt: -1 });

// Commission rates by level
referralCommissionSchema.statics.COMMISSION_RATES = {
  1: 20, // 20%
  2: 15, // 15%
  3: 15, // 15%
  4: 10, // 10%
  5: 10  // 10%
};

// Static method to calculate commission for a level
referralCommissionSchema.statics.calculateCommission = function(amount, level) {
  const rate = this.COMMISSION_RATES[level] || 0;
  return (amount * rate) / 100;
};

module.exports = mongoose.model('ReferralCommission', referralCommissionSchema);
