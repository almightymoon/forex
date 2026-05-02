const express = require('express');
const LandingNewJoiners = require('../models/LandingNewJoiners');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = await LandingNewJoiners.getPublicPayload();
    res.json(payload);
  } catch (error) {
    console.error('newJoinersPublic GET error:', error);
    res.status(500).json({ enabled: false, joiners: [], error: 'Failed to load new joiners' });
  }
});

module.exports = router;
