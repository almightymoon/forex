const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { generateTokenWithTimeout } = require('../middleware/sessionTimeout');
const { logActivity } = require('../services/activityLogService');

const router = express.Router();

function requireDeveloperReal(req, res, next) {
  const real = String(req.user?.realRole || req.user?.role || '').toLowerCase();
  if (real !== 'developer') {
    return res.status(403).json({ error: 'Forbidden', message: 'Developer access required' });
  }
  next();
}

// POST /api/dev/impersonate { role: 'student' | 'teacher' | 'admin' }
router.post(
  '/impersonate',
  authenticateToken,
  requireDeveloperReal,
  [body('role').isIn(['student', 'teacher', 'admin']).withMessage('role must be one of: student, teacher, admin')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const role = String(req.body.role).toLowerCase();
    const token = await generateTokenWithTimeout(req.user._id, 'developer', {
      effectiveRole: role,
      impersonating: true
    });

    await logActivity({
      req,
      action: 'dev.impersonate',
      entity: { type: 'impersonation', label: role },
      metadata: { effectiveRole: role }
    });

    return res.json({
      message: `Now impersonating ${role}`,
      token,
      user: {
        ...req.user.getPublicProfile(),
        role, // effective role for client gating
        realRole: 'developer',
        isImpersonating: true
      }
    });
  }
);

// POST /api/dev/stop-impersonate
router.post('/stop-impersonate', authenticateToken, requireDeveloperReal, async (req, res) => {
  const token = await generateTokenWithTimeout(req.user._id, 'developer', {
    impersonating: false
  });

  await logActivity({
    req,
    action: 'dev.stop_impersonate',
    entity: { type: 'impersonation', label: 'developer' }
  });

  return res.json({
    message: 'Returned to developer',
    token,
    user: {
      ...req.user.getPublicProfile(),
      role: 'developer',
      realRole: 'developer',
      isImpersonating: false
    }
  });
});

module.exports = router;

