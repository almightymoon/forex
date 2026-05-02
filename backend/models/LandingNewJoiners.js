const mongoose = require('mongoose');

const joinerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 },
    pkg: { type: String, trim: true, maxlength: 160 },
    imageUrl: { type: String, default: '', maxlength: 2000 },
    accentBg: { type: String, default: '#0d9488', maxlength: 32 },
  },
  { _id: false },
);

const landingNewJoinersSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'landing', unique: true, immutable: true },
    enabled: { type: Boolean, default: false },
    joiners: [joinerSchema],
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

landingNewJoinersSchema.statics.getDoc = async function getDoc() {
  let doc = await this.findOne({ singletonKey: 'landing' });
  if (!doc) {
    doc = await this.create({
      singletonKey: 'landing',
      enabled: false,
      joiners: [],
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

landingNewJoinersSchema.statics.getPublicPayload = async function getPublicPayload() {
  const doc = await this.getDoc();
  if (!doc.enabled) {
    return { enabled: false };
  }
  const payload = toPublicJSON(doc);
  const joiners = Array.isArray(payload.joiners)
    ? payload.joiners.filter((j) => j && String(j.name || '').trim().length > 0)
    : [];
  return { ...payload, joiners };
};

const ACCENT_DEFAULTS = ['#0d9488', '#ea580c', '#2563eb', '#0891b2', '#7c3aed', '#c41e3a'];

landingNewJoinersSchema.statics.upsertFromBody = async function upsertFromBody(rawBody, userId) {
  const doc = await this.getDoc();
  const { enabled, joiners } = rawBody || {};

  if (typeof enabled === 'boolean') doc.enabled = enabled;

  if (Array.isArray(joiners)) {
    doc.joiners = joiners.slice(0, 40).map((j, i) => ({
      name: String(j?.name ?? '').trim().slice(0, 120),
      country: String(j?.country ?? '').trim().slice(0, 120),
      pkg: String(j?.pkg ?? j?.package ?? '').trim().slice(0, 160),
      imageUrl: String(j?.imageUrl ?? '').trim().slice(0, 2000),
      accentBg: String(j?.accentBg ?? '').trim().slice(0, 32) || ACCENT_DEFAULTS[i % ACCENT_DEFAULTS.length],
    }));
    doc.joiners = doc.joiners.filter((r) => r.name.length > 0);
  }

  if (userId) doc.lastUpdatedBy = userId;

  await doc.save();
  return doc;
};

module.exports = mongoose.model('LandingNewJoiners', landingNewJoinersSchema);
