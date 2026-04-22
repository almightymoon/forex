const mongoose = require('mongoose');

const rankRewardUnlockSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rule: { type: mongoose.Schema.Types.ObjectId, ref: 'RankRewardRule', required: true },
    thresholdBalance: { type: Number, required: true, min: 0 },
    unlockedAt: { type: Date, default: Date.now },
    balanceAtUnlock: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['unlocked', 'fulfilled', 'cancelled'],
      default: 'unlocked'
    },
    fulfilledAt: { type: Date },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fulfillmentNotes: { type: String, trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

rankRewardUnlockSchema.index({ user: 1, rule: 1 }, { unique: true });
rankRewardUnlockSchema.index({ status: 1, unlockedAt: -1 });

module.exports = mongoose.model('RankRewardUnlock', rankRewardUnlockSchema);

