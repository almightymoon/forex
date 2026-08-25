const mongoose = require('mongoose');
const User = require('../models/User');

/** Strict 24-char hex ObjectId check (avoids mongoose isValid false-positives). */
function isStrictObjectId(value) {
  if (value == null) return false;
  if (value instanceof mongoose.Types.ObjectId) return true;
  const str = String(value);
  return /^[a-fA-F0-9]{24}$/.test(str);
}

/**
 * Resolve a MongoDB ObjectId from either a 24-hex id or a public userId like "USER-24WJCB".
 * Returns null when nothing can be resolved — never returns an invalid castable string.
 */
async function resolveUserObjectId(value) {
  if (value == null || value === '') return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  // Mongoose document
  if (typeof value === 'object' && value._id) {
    return resolveUserObjectId(value._id);
  }

  const str = String(value).trim();
  if (!str) return null;

  if (isStrictObjectId(str)) {
    return new mongoose.Types.ObjectId(str);
  }

  // Public account codes: USER-XXXXXX
  const code = str.toUpperCase();
  const user = await User.findOne({ userId: code }).select('_id').lean();
  return user?._id || null;
}

/**
 * Resolve the authenticated request user to a strict ObjectId.
 */
async function resolveRequestUserObjectId(reqUser) {
  if (!reqUser) return null;

  if (isStrictObjectId(reqUser._id)) {
    return reqUser._id instanceof mongoose.Types.ObjectId
      ? reqUser._id
      : new mongoose.Types.ObjectId(String(reqUser._id));
  }

  if (reqUser.userId) {
    const byCode = await resolveUserObjectId(reqUser.userId);
    if (byCode) return byCode;
  }

  // Last resort: look up by email if present
  if (reqUser.email) {
    const user = await User.findOne({ email: String(reqUser.email).toLowerCase() })
      .select('_id')
      .lean();
    if (user?._id) return user._id;
  }

  return null;
}

module.exports = {
  isStrictObjectId,
  resolveUserObjectId,
  resolveRequestUserObjectId,
};
