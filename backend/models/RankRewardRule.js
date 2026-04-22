const mongoose = require('mongoose');

const rankRewardRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    thresholdBalance: { type: Number, required: true, min: 0 },
    rewardDescription: { type: String, required: true, trim: true, maxlength: 500 },
    rewardValue: { type: String, default: '', trim: true, maxlength: 200 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

rankRewardRuleSchema.index({ isActive: 1, thresholdBalance: 1 });

module.exports = mongoose.model('RankRewardRule', rankRewardRuleSchema);

