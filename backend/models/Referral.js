const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  user: {
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
  referralCode: {
    type: String,
    required: true,
    uppercase: true
  },
  parentReferralCode: {
    type: String,
    required: true,
    uppercase: true
  }
}, {
  timestamps: true
});

// Indexes
referralSchema.index({ user: 1 });
referralSchema.index({ referrer: 1 });
referralSchema.index({ level: 1 });
referralSchema.index({ user: 1, referrer: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
