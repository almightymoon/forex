const express = require('express');
const Settings = require('../models/Settings');

const router = express.Router();

// @route   GET /api/settings/public
// @desc    Get public platform settings (no auth required)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Only return public settings
    const publicSettings = {
      platformName: settings.platformName,
      description: settings.description,
      defaultCurrency: settings.defaultCurrency,
      maintenanceMode: settings.maintenanceMode
    };
    
    res.json(publicSettings);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

module.exports = router;
