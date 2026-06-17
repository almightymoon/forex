const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
    // Index is automatically created by unique: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'teacher', 'admin', 'developer'],
    default: 'student'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'Pakistan'
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'easypaisa', 'jazz_cash'],
    default: 'credit_card'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  promoCode: {
    code: String,
    appliedAt: Date,
    discount: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerifiedAt: Date,
  phoneVerifiedAt: Date,
  security: {
    isLocked: {
      type: Boolean,
      default: false
    },
    lockedUntil: Date,
    lockReason: String,
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lastFailedLogin: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: String,
    backupCodes: [String],
    lastPasswordChange: {
      type: Date,
      default: Date.now
    },
    sessionTokens: [{
      token: String,
      createdAt: Date,
      expiresAt: Date,
      ipAddress: String,
      userAgent: String
    }]
  },
  enrolledCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedLessons: {
      type: Number,
      default: 0
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    expoPushToken: {
      type: String,
      default: null
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  // Badge system for purchased packages
  badges: [{
    packageName: {
      type: String,
      required: true,
      enum: ['FX Launch', 'FX Scale', 'FX Legacy']
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    },
    packagePrice: Number
  }],
  // Referral system
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
    // Index is automatically created by unique: true
  },
  parentReferralCode: {
    type: String,
    ref: 'User',
    uppercase: true,
    trim: true
  },
  /** True when user was assigned a referrer only via default referral link (no ref param). No commission paid on their purchases. */
  referredByDefaultCode: {
    type: Boolean,
    default: false
  },
  referralStats: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    verifiedReferrals: {
      type: Number,
      default: 0
    },
    level1Count: { type: Number, default: 0 },
    level2Count: { type: Number, default: 0 },
    level3Count: { type: Number, default: 0 },
    level4Count: { type: Number, default: 0 },
    level5Count: { type: Number, default: 0 }
  },
  // Balance for withdrawals
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  // Lifetime earned (sum of all positive balance transactions).
  // Used for rank rewards so withdrawals don't reduce progress.
  lifetimeEarned: {
    type: Number,
    default: 0,
    min: [0, 'Lifetime earned cannot be negative']
  },
  /** When set, admin GET/rank UI uses `lifetimeEarned` instead of recomputing from transactions. */
  lifetimeEarnedOverrideAt: {
    type: Date,
    default: null
  },
  // Selected package during registration
  selectedPackage: {
    packageName: {
      type: String,
      enum: ['FX Launch', 'FX Scale', 'FX Legacy']
    },
    price: Number,
    selectedAt: Date
  },
  // Stop sending emails (e.g. bounce / unreachable)
  emailUnreachable: {
    type: Boolean,
    default: false
  },
  emailUnreachableAt: Date,
  emailUnreachableReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  /** UTC first day of month: recurring monthly-fee rules apply only for “due” months on/after this (defers obligation). */
  monthlyFeeBillingStartsMonthStart: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for isSubscribed
userSchema.virtual('isSubscribed').get(function() {
  return this.subscription.isActive && 
         this.subscription.endDate && 
         new Date() < this.subscription.endDate;
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
// referralCode and userId indexes are automatically created by unique: true
// userSchema.index({ referralCode: 1 });  // Duplicate - already created by unique: true
// userSchema.index({ userId: 1 });  // Duplicate - already created by unique: true
userSchema.index({ parentReferralCode: 1 }, { sparse: true });

// Static method to generate unique user ID
userSchema.statics.generateUserId = async function() {
  const generateId = () => {
    // Format: USER-XXXXXX where XXXXXX is 6 alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `USER-${id}`;
  };

  let userId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    userId = generateId();
    const existing = await this.findOne({ userId: userId });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique user ID');
  }

  return userId;
};

// Pre-save middleware to generate userId for new users
userSchema.pre('save', async function(next) {
  // Generate userId if it doesn't exist (for new users)
  if (this.isNew && !this.userId) {
    try {
      this.userId = await this.constructor.generateUserId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to generate unique referral code
userSchema.statics.generateReferralCode = async function() {
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateCode();
    const existing = await this.findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code');
  }

  return code;
};

// Method to add badge
userSchema.methods.addBadge = function(packageName, packagePrice) {
  // Check if badge already exists
  const existingBadge = this.badges.find(b => b.packageName === packageName);
  if (!existingBadge) {
    this.badges.push({
      packageName,
      purchasedAt: new Date(),
      packagePrice
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to get referral tree (up to 5 levels)
userSchema.methods.getReferralTree = async function() {
  const User = this.constructor;
  const tree = [];
  let currentUser = this;
  let level = 0;
  const maxLevel = 5;

  while (currentUser && level < maxLevel) {
    tree.push({
      userId: currentUser._id,
      email: currentUser.email,
      name: `${currentUser.firstName} ${currentUser.lastName}`,
      level: level + 1,
      referralCode: currentUser.referralCode
    });

    if (currentUser.parentReferralCode) {
      currentUser = await User.findOne({ referralCode: currentUser.parentReferralCode });
      level++;
    } else {
      break;
    }
  }

  return tree;
};

module.exports = mongoose.model('User', userSchema);
