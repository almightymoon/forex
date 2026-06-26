const express = require('express');
const fs = require('fs');
const path = require('path');

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
