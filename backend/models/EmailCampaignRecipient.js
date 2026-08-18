const mongoose = require('mongoose');

const emailCampaignRecipientSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

emailCampaignRecipientSchema.index({ campaign: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EmailCampaignRecipient', emailCampaignRecipientSchema);
