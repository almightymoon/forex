const ActivityLog = require('../models/ActivityLog');

function getReqIp(req) {
  return (
    (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    ''
  )
    .toString()
    .split(',')[0]
    .trim();
}

async function logActivity({ req, actor, action, entity, metadata }) {
  try {
    const actorSafe = actor || (req && req.user
      ? { userId: req.user._id, email: req.user.email, role: req.user.role }
      : undefined);

    await ActivityLog.create({
      actor: actorSafe,
      action,
      entity,
      metadata: metadata || {},
      ip: req ? getReqIp(req) : undefined,
      userAgent: req ? (req.headers['user-agent'] || '') : undefined
    });
  } catch (e) {
    // Never break business logic due to logging
    console.error('[ActivityLog] Failed to write log:', e.message || e);
  }
}

module.exports = { logActivity };

