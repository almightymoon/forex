const mongoose = require('mongoose');

const emailButtonClickSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      required: true,
      index: true,
    },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaignRecipient' },
    buttonId: { type: String, required: true, trim: true },
    buttonLabel: { type: String, default: '', trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    ipAddress: { type: String, default: '', trim: true, maxlength: 80 },
    userAgent: { type: String, default: '', trim: true, maxlength: 400 },
    clickedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailButtonClickSchema.index({ campaign: 1, email: 1 }, { unique: true });
emailButtonClickSchema.index({ campaign: 1, clickedAt: -1 });

module.exports = mongoose.model('EmailButtonClick', emailButtonClickSchema);
