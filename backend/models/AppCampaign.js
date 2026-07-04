const mongoose = require('mongoose');

const ctaSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Learn more', trim: true, maxlength: 80 },
    action: {
      type: String,
      enum: ['link', 'route', 'dismiss_only'],
      default: 'dismiss_only',
    },
    url: { type: String, default: '', trim: true, maxlength: 500 },
    route: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { _id: false },
);

const appCampaignSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Campaign ID must be lowercase letters, numbers, and hyphens'],
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: '', trim: true, maxlength: 2000 },
    badge: { type: String, default: '', trim: true, maxlength: 40 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 500 },
    cta: { type: ctaSchema, default: () => ({}) },
    showDismissButton: { type: Boolean, default: true },
    layout: {
      type: String,
      enum: ['standard', 'image_only', 'image_with_text', 'custom'],
      default: 'standard',
    },
    showTitle: { type: Boolean, default: true },
    showBody: { type: Boolean, default: true },
    showBadge: { type: Boolean, default: true },
    showCtaButton: { type: Boolean, default: true },
    showBorder: { type: Boolean, default: true },
    imageClickable: { type: Boolean, default: false },
    imageFit: {
      type: String,
      enum: ['cover', 'contain'],
      default: 'cover',
    },
    imageHeight: {
      type: String,
      enum: ['compact', 'medium', 'large', 'auto'],
      default: 'medium',
    },
    borderRadius: { type: Number, default: 16, min: 0, max: 48 },
    dismissMode: {
      type: String,
      enum: ['session', 'day', 'campaign'],
      default: 'campaign',
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    platforms: {
      type: [String],
      enum: ['mobile', 'web'],
      default: ['mobile', 'web'],
    },
    audience: {
      type: String,
      enum: ['all', 'guest', 'authenticated', 'student', 'teacher', 'admin'],
      default: 'authenticated',
    },
    allowedPackages: {
      type: [Number],
      default: null,
    },
    frequency: {
      type: String,
      enum: ['once_per_session', 'once_per_day', 'every_open'],
      default: 'once_per_session',
    },
    priority: { type: Number, default: 0 },
    version: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date },
    /** Version number for which in-app/push notifications were already sent */
    lastNotifiedVersion: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

appCampaignSchema.index({ status: 1, startAt: 1, endAt: 1, priority: -1 });

module.exports = mongoose.model('AppCampaign', appCampaignSchema);
