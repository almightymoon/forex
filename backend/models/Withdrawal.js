const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'USDT'],
    default: 'USDT'
  },
  walletAddress: {
    type: String,
    required: [true, 'Wallet address is required'],
    trim: true
  },
  network: {
    type: String,
    enum: ['TRC20', 'ERC20', 'BEP20'],
    default: 'TRC20'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  transactionHash: {
    type: String,
    sparse: true,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
withdrawalSchema.index({ user: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ createdAt: -1 });

// Virtual for isProcessable
withdrawalSchema.virtual('isProcessable').get(function() {
  return this.status === 'pending' || this.status === 'processing';
});

// Method to process withdrawal
withdrawalSchema.methods.process = function(processedBy, transactionHash, notes) {
  if (this.status !== 'pending') {
    throw new Error('Only pending withdrawals can be processed');
  }
  
  this.status = 'processing';
  this.processedBy = processedBy;
  this.transactionHash = transactionHash;
  this.notes = notes;
  
  return this.save();
};

// Method to complete withdrawal
withdrawalSchema.methods.complete = function(transactionHash) {
  if (this.status !== 'processing' && this.status !== 'pending') {
    throw new Error('Only pending or processing withdrawals can be completed');
  }
  
  this.status = 'completed';
  this.processedAt = new Date();
  if (transactionHash) {
    this.transactionHash = transactionHash;
  }
  
  return this.save();
};

// Method to reject withdrawal
withdrawalSchema.methods.reject = function(processedBy, reason) {
  if (this.status !== 'pending' && this.status !== 'processing') {
    throw new Error('Only pending or processing withdrawals can be rejected');
  }
  
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.processedBy = processedBy;
  
  return this.save();
};

// Method to cancel withdrawal
withdrawalSchema.methods.cancel = function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending withdrawals can be cancelled');
  }
  
  this.status = 'cancelled';
  return this.save();
};

// Static method to find pending withdrawals
withdrawalSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to find withdrawals by user
withdrawalSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 });
};

// Ensure virtuals are included when converting to JSON
withdrawalSchema.set('toJSON', { virtuals: true });
withdrawalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
