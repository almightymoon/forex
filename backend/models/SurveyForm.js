const mongoose = require('mongoose');

const FIELD_TYPES = [
  'short_text',
  'long_text',
  'email',
  'number',
  'phone',
  'dropdown',
  'multiple_choice',
  'checkboxes',
  'date',
  'time',
  'yes_no',
];

const formFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    placeholder: { type: String, default: '', trim: true, maxlength: 200 },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const surveyFormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    fields: { type: [formFieldSchema], default: [] },
    collectEmail: { type: Boolean, default: true },
    collectName: { type: Boolean, default: true },
    allowMultiple: { type: Boolean, default: true },
    confirmationMessage: {
      type: String,
      default: 'Thanks for your response. We have received your submission.',
      trim: true,
      maxlength: 500,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responseCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

surveyFormSchema.index({ createdAt: -1 });

surveyFormSchema.statics.FIELD_TYPES = FIELD_TYPES;

module.exports = mongoose.model('SurveyForm', surveyFormSchema);
