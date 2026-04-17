const express = require('express');
const Package = require('../models/Package');

const router = express.Router();

// @route   GET /api/packages
// @desc    Get active packages (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Ensure defaults exist for first-time deployments
    await Package.ensureDefaults();
    const packages = await Package.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    res.json(packages);
  } catch (error) {
    console.error('Get public packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

module.exports = router;

