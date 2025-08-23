const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'PKR', 'EUR', 'GBP'],
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['stripe', 'paypal', 'jazzcash', 'easypaisa', 'bank_transfer', 'cash', 'promo_code', 'credit_card']
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  externalPaymentId: {
    type: String, // ID from payment gateway
    sparse: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['signup', 'course', 'session', 'subscription', 'signal'],
    default: 'signup'
  },
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    paymentIntentId: String,
    chargeId: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode'
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  finalAmount: {
    type: Number,
    required: [true, 'Final amount is required'],
    min: [0, 'Final amount cannot be negative']
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundReason: String,
  refundedAt: Date,
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  failureReason: String,
  failureCode: String,
  retryCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum retry count is 3']
  },
  nextRetryAt: Date,
  metadata: {
    type: Map,
    of: String
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  nextBillingDate: Date,
  subscriptionId: String,
  invoiceUrl: String,
  receiptUrl: String
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ user: 1 });
paymentSchema.index({ course: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ externalPaymentId: 1 });

// Virtual for total amount including tax and discount
paymentSchema.virtual('totalAmount').get(function() {
  return this.amount + this.taxAmount - this.discountAmount;
});

// Virtual for isRefundable
paymentSchema.virtual('isRefundable').get(function() {
  return this.status === 'completed' && this.refundAmount === 0;
});

// Virtual for isExpired
paymentSchema.virtual('isExpired').get(function() {
  // Consider payment expired if pending for more than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.status === 'pending' && this.createdAt < twentyFourHoursAgo;
});

// Method to process payment
paymentSchema.methods.processPayment = function(paymentData) {
  this.status = 'processing';
  this.externalPaymentId = paymentData.externalPaymentId;
  this.paymentDetails = paymentData.paymentDetails;
  this.transactionId = paymentData.transactionId;
  
  return this.save();
};

// Method to complete payment
paymentSchema.methods.completePayment = function() {
  this.status = 'completed';
  return this.save();
};

// Method to fail payment
paymentSchema.methods.failPayment = function(reason, code) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failureCode = code;
  
  if (this.retryCount < 3) {
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes later
  }
  
  return this.save();
};

// Method to refund payment
paymentSchema.methods.refundPayment = function(amount, reason, refundedBy) {
  if (this.status !== 'completed') {
    throw new Error('Only completed payments can be refunded');
  }
  
  if (amount > this.finalAmount) {
    throw new Error('Refund amount cannot exceed final amount');
  }
  
  this.status = 'refunded';
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.refundedBy = refundedBy;
  
  return this.save();
};

// Method to cancel payment
paymentSchema.methods.cancelPayment = function() {
  if (this.status === 'pending' || this.status === 'processing') {
    this.status = 'cancelled';
    return this.save();
  }
  throw new Error('Cannot cancel payment in current status');
};

// Method to retry payment
paymentSchema.methods.retryPayment = function() {
  if (this.status === 'failed' && this.retryCount < 3) {
    this.status = 'pending';
    this.failureReason = undefined;
    this.failureCode = undefined;
    return this.save();
  }
  throw new Error('Payment cannot be retried');
};

// Static method to find pending payments
paymentSchema.statics.findPending = function() {
  return this.find({ status: 'pending' });
};

// Static method to find failed payments
paymentSchema.statics.findFailed = function() {
  return this.find({ status: 'failed' });
};

// Static method to find payments by user
paymentSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

// Static method to find payments by course
paymentSchema.statics.findByCourse = function(courseId) {
  return this.find({ course: courseId }).sort({ createdAt: -1 });
};

// Static method to calculate total revenue
paymentSchema.statics.calculateRevenue = function(startDate, endDate) {
  const matchStage = {
    status: 'completed'
  };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } }
  ]);
};

// Pre-save middleware to calculate final amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('taxAmount') || this.isModified('discountAmount')) {
    this.finalAmount = this.amount + this.taxAmount - this.discountAmount;
  }
  
  if (this.finalAmount < 0) {
    return next(new Error('Final amount cannot be negative'));
  }
  
  next();
});

// Ensure virtuals are included when converting to JSON
paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);
