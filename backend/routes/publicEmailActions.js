const express = require('express');
const rateLimit = require('express-rate-limit');
const { loadPublicAction, recordClick } = require('../services/emailCampaigns');

const router = express.Router();

const clickLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || '';
}

router.get('/:token', clickLimiter, async (req, res) => {
  try {
    const result = await loadPublicAction(req.params.token);
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json({ campaign: result.campaign, existing: result.existing });
  } catch (error) {
    console.error('Public email action fetch error:', error);
    res.status(500).json({ error: 'Failed to load this email action' });
  }
});

router.post('/:token', clickLimiter, async (req, res) => {
  try {
    const buttonId = req.body?.buttonId || req.query.b;
    const result = await recordClick({
      token: req.params.token,
      buttonId,
      ipAddress: clientIp(req),
      userAgent: req.get('user-agent') || '',
    });
    if (result.status !== 200) {
      return res.status(result.status).json({
        error: result.error,
        campaign: result.campaign || null,
      });
    }
    res.json({
      success: true,
      confirmationMessage: result.confirmationMessage,
      button: result.button,
      campaign: result.campaign,
    });
  } catch (error) {
    console.error('Public email action click error:', error);
    res.status(500).json({ error: 'Failed to record your response' });
  }
});

module.exports = router;
