const mongoose = require('mongoose');

const rowSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    values: [{ type: Number }],
  },
  { _id: false },
);

const landingMonthlyProgressSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'landing', unique: true, immutable: true },
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Monthly trading progress', maxlength: 160 },
    subtitle: { type: String, default: '', maxlength: 300 },
    periodLabel: { type: String, default: '', maxlength: 160 },
    displayMode: {
      type: String,
      enum: ['structured', 'split_images', 'full_image'],
      default: 'structured',
    },
    columnLabels: [{ type: String, maxlength: 48 }],
    rows: [rowSchema],
    leftImageUrl: { type: String, default: '' },
    rightImageUrl: { type: String, default: '' },
    fullImageUrl: { type: String, default: '' },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

landingMonthlyProgressSchema.statics.getDoc = async function getDoc() {
  let doc = await this.findOne({ singletonKey: 'landing' });
  if (!doc) {
    doc = await this.create({
      singletonKey: 'landing',
      enabled: false,
      columnLabels: ['Jan', 'Feb', 'Mar'],
      rows: [],
    });
  }
  return doc;
};

function toPublicJSON(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.singletonKey;
  delete o.lastUpdatedBy;
  delete o.__v;
  return o;
}

landingMonthlyProgressSchema.statics.getPublicPayload = async function getPublicPayload() {
  const doc = await this.getDoc();
  if (!doc.enabled) {
    return { enabled: false };
  }
  const payload = toPublicJSON(doc);
  return payload;
};

landingMonthlyProgressSchema.statics.upsertFromBody = async function upsertFromBody(rawBody, userId) {
  const doc = await this.getDoc();
  const {
    enabled,
    title,
    subtitle,
    periodLabel,
    displayMode,
    columnLabels,
    rows,
    leftImageUrl,
    rightImageUrl,
    fullImageUrl,
  } = rawBody || {};

  if (typeof enabled === 'boolean') doc.enabled = enabled;
  if (typeof title === 'string') doc.title = title.trim().slice(0, 160);
  if (typeof subtitle === 'string') doc.subtitle = subtitle.trim().slice(0, 300);
  if (typeof periodLabel === 'string') doc.periodLabel = periodLabel.trim().slice(0, 160);
  if (['structured', 'split_images', 'full_image'].includes(displayMode)) {
    doc.displayMode = displayMode;
  }

  if (Array.isArray(columnLabels)) {
    doc.columnLabels = columnLabels
      .map((c) => String(c || '').trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 24);
  }

  if (Array.isArray(rows)) {
    doc.rows = rows
      .slice(0, 40)
      .map((r) => ({
        name: String(r?.name ?? '').trim().slice(0, 120),
        values: Array.isArray(r?.values)
          ? r.values.slice(0, 24).map((v) => {
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            })
          : [],
      }))
      .filter((r) => r.name.length > 0);
  }

  if (typeof leftImageUrl === 'string') doc.leftImageUrl = leftImageUrl.trim().slice(0, 2000);
  if (typeof rightImageUrl === 'string') doc.rightImageUrl = rightImageUrl.trim().slice(0, 2000);
  if (typeof fullImageUrl === 'string') doc.fullImageUrl = fullImageUrl.trim().slice(0, 2000);

  const nCols = doc.columnLabels.length;
  if (doc.displayMode === 'structured' && nCols > 0) {
    doc.rows = doc.rows.map((r) => ({
      name: r.name,
      values: r.values.slice(0, nCols).concat(Array(Math.max(0, nCols - r.values.length)).fill(0)),
    }));
  }

  if (userId) doc.lastUpdatedBy = userId;

  await doc.save();
  return doc;
};

module.exports = mongoose.model('LandingMonthlyProgress', landingMonthlyProgressSchema);
