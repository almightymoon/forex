const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const LOG_FILE = path.join(__dirname, '../logs/mobile-crashes.jsonl');

function appendCrashReports(reports) {
  if (!Array.isArray(reports) || reports.length === 0) return;
  const lines = reports
    .map((report) =>
      JSON.stringify({
        receivedAt: new Date().toISOString(),
        ...report,
      }),
    )
    .join('\n')
    .concat('\n');

  fs.appendFile(LOG_FILE, lines, (err) => {
    if (err) console.error('[MobileCrash] Failed to write log file:', err.message);
  });

  for (const report of reports) {
    console.error(
      '[MobileCrash]',
      report.platform,
      report.type,
      report.message,
      report.deviceName || '',
    );
  }
}

/** Register Expo push token (auth only — no package subscription required). */
router.put('/push-token', [
  authenticateToken,
  body('expoPushToken').isString().trim().notEmpty().withMessage('Expo push token is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const token = req.body.expoPushToken.trim();
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'preferences.expoPushToken': token,
        'preferences.pushNotifications': true,
      },
    });

    res.json({ ok: true, message: 'Push token registered' });
  } catch (error) {
    console.error('[MobilePush] Register token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

function maskToken(token) {
  if (!token) return null;
  const str = String(token);
  return str.length <= 14 ? str : `${str.slice(0, 10)}…${str.slice(-6)}`;
}

/** Report whether the server has a usable push token for this user. */
router.get('/push-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('preferences.expoPushToken preferences.pushNotifications role isActive')
      .lean();

    const token = user?.preferences?.expoPushToken || null;
    res.json({
      hasToken: !!token,
      token: maskToken(token),
      pushEnabled: user?.preferences?.pushNotifications !== false,
      role: user?.role,
      eligibleForSignalPush: user?.role === 'student' && user?.isActive !== false && !!token,
    });
  } catch (error) {
    console.error('[MobilePush] Status error:', error);
    res.status(500).json({ error: 'Failed to read push status' });
  }
});

/** Send a test push to this user's own device to verify end-to-end delivery. */
router.post('/push-test', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('preferences.expoPushToken preferences.pushNotifications')
      .lean();

    const token = user?.preferences?.expoPushToken;
    if (!token) {
      return res.status(400).json({
        ok: false,
        reason: 'no_token',
        message: 'No push token stored for this account. Open the app once with notifications allowed.',
      });
    }

    const { sendToTokens } = require('../services/expoPushService');
    const result = await sendToTokens([token], {
      title: 'Test notification',
      body: 'Push notifications are working on this device.',
      data: { type: 'system', link: '/(app)/notifications' },
      channelId: 'default',
    });

    console.log(
      `[MobilePush] Test push for ${req.user._id}: sent=${result.sent} failed=${result.failed} ${(result.errors || []).join('; ')}`
    );

    res.json({
      ok: result.sent > 0,
      token: maskToken(token),
      sent: result.sent,
      failed: result.failed,
      errors: result.errors || [],
      message:
        result.sent > 0
          ? 'Test push accepted by Expo. It should arrive on your device within seconds.'
          : (result.errors || []).join('; ') || 'Expo rejected the push request.',
    });
  } catch (error) {
    console.error('[MobilePush] Test push error:', error);
    res.status(500).json({ ok: false, error: 'Failed to send test push', message: error.message });
  }
});

/** Accept crash / error reports from the mobile app (auth optional). */
router.post('/crash-reports', (req, res) => {
  try {
    const reports = req.body?.reports ?? (req.body?.message ? [req.body] : []);
    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({ error: 'No reports provided' });
    }
    if (reports.length > 20) {
      return res.status(400).json({ error: 'Too many reports in one request' });
    }
    appendCrashReports(reports);
    res.json({ ok: true, received: reports.length });
  } catch (error) {
    console.error('[MobileCrash] Handler error:', error);
    res.status(500).json({ error: 'Failed to store crash report' });
  }
});

module.exports = router;
