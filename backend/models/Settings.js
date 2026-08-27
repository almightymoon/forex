const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Settings
  platformName: {
    type: String,
    default: 'Forex Navigators',
    maxlength: [50, 'Platform name cannot exceed 50 characters']
  },
  description: {
    type: String,
    default: 'Premier Trading Education Platform',
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  defaultCurrency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'PKR'],
    default: 'USD'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceAllowTeachers: {
    type: Boolean,
    default: false
  },
  defaultReferralCode: {
    type: String,
    default: '',
    trim: true,
    uppercase: true,
    maxlength: [20, 'Referral code cannot exceed 20 characters']
  },
  telegramInviteEnabled: {
    type: Boolean,
    default: true
  },
  telegramInviteUrl: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Telegram invite URL cannot exceed 500 characters']
  },
  trustpilotReviewUrl: {
    type: String,
    default: 'https://www.trustpilot.com/evaluate/thefxnavigators.com',
    trim: true,
    maxlength: [500, 'Trustpilot review URL cannot exceed 500 characters']
  },

  // Security Settings
  security: {
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 60,
      min: 15,
      max: 480
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
        min: 6,
        max: 20
      },
      requireUppercase: {
        type: Boolean,
        default: true
      },
      requireNumbers: {
        type: Boolean,
        default: true
      },
      requireSymbols: {
        type: Boolean,
        default: true
      }
    },
    loginAttempts: {
      type: Number,
      default: 5,
      min: 3,
      max: 10
    },
    accountLockDuration: {
      type: Number,
      default: 30,
      min: 5,
      max: 1440
    }
  },

  // Notification Settings
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    newUserRegistration: {
      type: Boolean,
      default: true
    },
    paymentReceived: {
      type: Boolean,
      default: true
    },
    systemAlerts: {
      type: Boolean,
      default: true
    },
    courseCompletions: {
      type: Boolean,
      default: false
    }
  },

  // Payment Settings
  payments: {
    stripeEnabled: {
      type: Boolean,
      default: true
    },
    paypalEnabled: {
      type: Boolean,
      default: true
    },
    easypaisaEnabled: {
      type: Boolean,
      default: true
    },
    jazzCashEnabled: {
      type: Boolean,
      default: true
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'PKR'],
      default: 'USD'
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 50
    },
    promoCodesEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Course Settings
  courses: {
    autoApproval: {
      type: Boolean,
      default: false
    },
    maxFileSize: {
      type: Number,
      default: 100,
      min: 10,
      max: 1000
    },
    allowedFileTypes: [{
      type: String,
      enum: ['pdf', 'mp4', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'png']
    }],
    certificateEnabled: {
      type: Boolean,
      default: true
    },
    completionThreshold: {
      type: Number,
      default: 80,
      min: 50,
      max: 100
    }
  },

  // Email Settings
  email: {
    smtpHost: {
      type: String,
      default: ''
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUser: {
      type: String,
      default: ''
    },
    smtpPassword: {
      type: String,
      default: ''
    },
    fromEmail: {
      type: String,
      default: 'noreply@forexnavigators.com'
    },
    fromName: {
      type: String,
      default: 'Forex Navigators'
    },
    isMockMode: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
