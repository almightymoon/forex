const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, 'Promo code can only contain uppercase letters and numbers']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  maxUses: {
    type: Number,
    default: null,
    min: [1, 'Maximum uses must be at least 1']
  },
  currentUses: {
    type: Number,
    default: 0,
    min: [0, 'Current uses cannot be negative']
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableTo: [{
    type: String,
    enum: ['signup', 'course', 'session', 'subscription', 'signal', 'all'],
    default: 'all'
  }],
  minimumAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum amount cannot be negative']
  },
  maximumDiscount: {
    type: Number,
    default: null,
    min: [0, 'Maximum discount cannot be negative']
  },
  userRestrictions: {
    newUsersOnly: {
      type: Boolean,
      default: false
    },
    existingUsersOnly: {
      type: Boolean,
      default: false
    },
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    excludedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  categoryRestrictions: [{
    type: String,
    enum: ['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general']
  }],
  levelRestrictions: [{
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  }],
  usageHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderAmount: Number,
    discountApplied: Number,
    finalAmount: Number
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining uses
promoCodeSchema.virtual('remainingUses').get(function() {
  if (this.maxUses === null) return 'unlimited';
  return Math.max(0, this.maxUses - this.currentUses);
});

// Virtual for isUnlimited
promoCodeSchema.virtual('isUnlimited').get(function() {
  return this.maxUses === null;
});

// Virtual for isExpired
promoCodeSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Virtual for isAvailable
promoCodeSchema.virtual('isAvailable').get(function() {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  if (this.maxUses && this.currentUses >= this.maxUses) return false;
  return true;
});

// Virtual for formatted discount
promoCodeSchema.virtual('formattedDiscount').get(function() {
  if (this.discountType === 'percentage') {
    return `${this.discountValue}%`;
  }
  return `$${this.discountValue.toFixed(2)}`;
});

// Virtual for usage percentage
promoCodeSchema.virtual('usagePercentage').get(function() {
  if (this.maxUses === null) return 0;
  return ((this.currentUses / this.maxUses) * 100).toFixed(1);
});

// Indexes for better query performance

promoCodeSchema.index({ isActive: 1 });
promoCodeSchema.index({ validUntil: 1 });
promoCodeSchema.index({ applicableTo: 1 });
promoCodeSchema.index({ createdBy: 1 });
promoCodeSchema.index({ 'usageHistory.user': 1 });

// Pre-save middleware to validate dates
promoCodeSchema.pre('save', function(next) {
  if (this.validFrom >= this.validUntil) {
    return next(new Error('Valid from date must be before valid until date'));
  }
  next();
});

// Method to validate promo code for a user
promoCodeSchema.methods.validateForUser = function(user, orderAmount, orderType) {
  // Check if code is available
  if (!this.isAvailable) {
    return { valid: false, reason: 'Promo code is not available' };
  }
  
  // Check if user is restricted
  if (this.userRestrictions.newUsersOnly && user.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return { valid: false, reason: 'Promo code is only for new users' };
  }
  
  if (this.userRestrictions.existingUsersOnly && user.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return { valid: false, reason: 'Promo code is only for existing users' };
  }
  
  if (this.userRestrictions.specificUsers.length > 0 && 
      !this.userRestrictions.specificUsers.includes(user._id)) {
    return { valid: false, reason: 'Promo code is not available for this user' };
  }
  
  if (this.userRestrictions.excludedUsers.includes(user._id)) {
    return { valid: false, reason: 'Promo code is not available for this user' };
  }
  
  // Check if order type is applicable
  if (!this.applicableTo.includes('all') && !this.applicableTo.includes(orderType)) {
    return { valid: false, reason: 'Promo code is not applicable to this order type' };
  }
  
  // Check minimum amount
  if (orderAmount < this.minimumAmount) {
    return { valid: false, reason: `Minimum order amount is $${this.minimumAmount}` };
  }
  
  // Check if user has already used this code
  const hasUsed = this.usageHistory.some(usage => 
    usage.user.toString() === user._id.toString()
  );
  
  if (hasUsed) {
    return { valid: false, reason: 'You have already used this promo code' };
  }
  
  return { valid: true };
};

// Method to apply promo code
promoCodeSchema.methods.applyToOrder = function(orderAmount) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
  } else {
    discount = this.discountValue;
  }
  
  // Apply maximum discount limit if set
  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }
  
  return Math.min(discount, orderAmount);
};

// Method to record usage
promoCodeSchema.methods.recordUsage = function(userId, orderAmount, discountApplied, finalAmount) {
  this.usageHistory.push({
    user: userId,
    usedAt: new Date(),
    orderAmount: orderAmount,
    discountApplied: discountApplied,
    finalAmount: finalAmount
  });
  
  this.currentUses += 1;
  
  // Deactivate if max uses reached
  if (this.maxUses && this.currentUses >= this.maxUses) {
    this.isActive = false;
  }
  
  return this;
};

// Method to deactivate code
promoCodeSchema.methods.deactivate = function() {
  this.isActive = false;
  return this;
};

// Method to extend validity
promoCodeSchema.methods.extendValidity = function(newValidUntil) {
  if (newValidUntil > this.validUntil) {
    this.validUntil = newValidUntil;
    return true;
  }
  return false;
};

// Static method to find active promo codes
promoCodeSchema.statics.findActive = function() {
  return this.find({
    isActive: true,
    validUntil: { $gt: new Date() },
    $or: [
      { maxUses: null },
      { currentUses: { $lt: '$maxUses' } }
    ]
  });
};

// Static method to find promo codes by type
promoCodeSchema.statics.findByType = function(discountType) {
  return this.find({ discountType, isActive: true });
};

// Static method to find promo codes by applicability
promoCodeSchema.statics.findByApplicability = function(applicableTo) {
  return this.find({
    $or: [
      { applicableTo: 'all' },
      { applicableTo: applicableTo }
    ],
    isActive: true,
    validUntil: { $gt: new Date() }
  });
};

// Static method to validate promo code
promoCodeSchema.statics.validateCode = function(code, user, orderAmount, orderType) {
  return this.findOne({ code: code.toUpperCase() })
    .then(promoCode => {
      if (!promoCode) {
        return { valid: false, reason: 'Invalid promo code' };
      }
      
      return promoCode.validateForUser(user, orderAmount, orderType);
    });
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);
