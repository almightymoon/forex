const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, default: '#dc2626', trim: true, maxlength: 20 },
  },
  { _id: false }
);

const emailCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    html: { type: String, default: '' },
    buttons: { type: [buttonSchema], default: [] },
    confirmationMessage: {
      type: String,
      default: 'Thanks, your response has been recorded.',
      trim: true,
      maxlength: 500,
    },
    isTest: { type: Boolean, default: false },
    recipientCount: { type: Number, default: 0, min: 0 },
    responseCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailCampaignSchema.index({ sentAt: -1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
