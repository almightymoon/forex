const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    html: { type: String, required: true },
    text: { type: String, default: '' },
    category: { type: String, default: 'custom', trim: true, maxlength: 60 },
    variables: { type: [String], default: () => ['firstName', 'lastName', 'email', 'userName'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ name: 1, createdAt: -1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
