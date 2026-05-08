const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  // Maintain lifetime earned as running sum of positive txns (withdrawals don't reduce this).
  const curLifetime = Number(userDoc.lifetimeEarned) || 0;
  if (amount > 0) {
    userDoc.lifetimeEarned = curLifetime + amount;
  } else if (amount < 0) {
    // Rollbacks are not "earned" and should reduce lifetimeEarned (but never below 0).
    // We detect rollbacks by description prefix or rollback metadata marker.
    const md = metadata;
    const hasRollbackMarker =
      md &&
      (md instanceof Map
        ? md.has('rollbackOfTransactionId') || md.get('rollbackSource')
        : typeof md.get === 'function'
          ? md.get('rollbackOfTransactionId') || md.get('rollbackSource')
          : md.rollbackOfTransactionId || md.rollbackSource);

    const isRollbackDescription =
      typeof description === 'string' &&
      description.toLowerCase().includes('commission rollback');

    if (hasRollbackMarker || isRollbackDescription) {
      userDoc.lifetimeEarned = Math.max(0, curLifetime + amount); // amount is negative
    }
  }
  await userDoc.save();

  // Rank rewards are based on direct referrals (level 1) only.
  // Do not evaluate here on balance changes (commissions/fees).
  
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

/**
 * Reverse all referral commissions that were distributed due to a user's completed payments.
 * Used when deleting a user (e.g. wrong payment details): subtracts those commissions from referrers' balances.
 * @param {ObjectId} userId - The purchaser user ID (the user being deleted)
 * @returns {Promise<{ reversedCount: number, reversedDetails: Array<{ referrerId, amount, paymentId }> }>}
 */
balanceTransactionSchema.statics.reverseCommissionsForUser = async function(userId) {
  const Payment = mongoose.model('Payment');
  const payments = await Payment.find({ user: userId, status: 'completed' }).lean();
  const reversedDetails = [];
  let reversedCount = 0;

  for (const payment of payments) {
    const commissionTxns = await this.find({
      type: 'referral_commission',
      relatedPayment: payment._id
    }).sort({ createdAt: 1 }).lean();

    for (const tx of commissionTxns) {
      await this.createTransaction({
        user: tx.user,
        type: 'adjustment',
        amount: -tx.amount,
        description: 'Commission rollback (purchaser user deleted)',
        relatedPayment: payment._id,
        notes: `Reversing referral commission of $${tx.amount} from deleted purchaser's payment`
      });
      reversedCount++;
      reversedDetails.push({
        referrerId: tx.user.toString(),
        amount: tx.amount,
        paymentId: payment._id.toString()
      });
    }
  }

  return { reversedCount, reversedDetails };
};

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);
