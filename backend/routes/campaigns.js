const express = require('express');
const { resolveActiveCampaign, getCampaignContext } = require('../utils/appCampaign');

const router = express.Router();

// @route   GET /api/campaigns/active
// @desc    Active in-app promo modal for platform (optional auth for targeting)
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const platform = String(req.query.platform || 'mobile').toLowerCase();
    if (!['mobile', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be mobile or web' });
    }

    const { user, userPackagePrice } = await getCampaignContext(req);
    const campaign = await resolveActiveCampaign({ platform, user, userPackagePrice });

    res.json({ campaign });
  } catch (error) {
    console.error('Get active campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

module.exports = router;
