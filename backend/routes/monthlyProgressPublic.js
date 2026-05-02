const express = require('express');
const LandingMonthlyProgress = require('../models/LandingMonthlyProgress');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = await LandingMonthlyProgress.getPublicPayload();
    res.json(payload);
  } catch (error) {
    console.error('monthlyProgressPublic GET error:', error);
    res.status(500).json({ enabled: false, error: 'Failed to load monthly progress' });
  }
});

module.exports = router;
