const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Index is defined separately below
  },
  type: {
    type: String,
    required: true,
    enum: [
      'credit',           // Admin credited balance
      'debit',            // Admin debited balance
      'bonus',            // Admin sent bonus
      'withdrawal',       // User withdrew funds
      'referral_commission', // Earned from referral
      'payment',          // Payment received
      'refund',           // Payment refunded
      'adjustment'        // Manual adjustment
    ]
  },
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // For system-generated transactions
  },
  relatedPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  relatedWithdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal'
  },
  metadata: {
    type: Map,
    of: String
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
balanceTransactionSchema.index({ user: 1, createdAt: -1 });
balanceTransactionSchema.index({ type: 1 });
balanceTransactionSchema.index({ performedBy: 1 });

// Static method to create a transaction
balanceTransactionSchema.statics.createTransaction = async function(data) {
  const { user, type, amount, description, performedBy, relatedPayment, relatedWithdrawal, notes, metadata } = data;
  
  const User = mongoose.model('User');
  const userDoc = await User.findById(user);
  
  if (!userDoc) {
    throw new Error('User not found');
  }
  
  const balanceBefore = userDoc.balance || 0;
  const balanceAfter = balanceBefore + amount;
  
  const transaction = new this({
    user,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    performedBy,
    relatedPayment,
    relatedWithdrawal,
    notes,
    metadata
  });
  
  await transaction.save();
  
  // Update user balance
  userDoc.balance = balanceAfter;
  await userDoc.save();
  
  return transaction;
};

// Static method to get user's transaction history
balanceTransactionSchema.statics.getUserTransactions = async function(userId, options = {}) {
  const { limit = 50, skip = 0, type } = options;
  
  let query = { user: userId };
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .populate('performedBy', 'firstName lastName email')
    .populate('relatedPayment')
    .populate('relatedWithdrawal')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);
