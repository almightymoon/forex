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
