const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');
const { evaluateRankRewardsForUser, getDirectReferralBusinessVolumeUsd } = require('../services/rankRewardService');

const router = express.Router();

// @route   GET /api/rank-rewards/progress
// @desc    Rank reward progress (rules + unlocks + direct referral package business volume)
// @access  Private
router.get('/progress', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('email referralCode').lean();
    const directBusinessVolumeUsd = await getDirectReferralBusinessVolumeUsd(userId);

    const rules = await RankRewardRule.find({ isActive: true })
      .sort({ thresholdBalance: 1, sortOrder: 1, createdAt: 1 })
      .lean();

    const unlocks = await RankRewardUnlock.find({ user: userId })
      .select('rule status unlockedAt fulfilledAt thresholdBalance balanceAtUnlock fulfillmentNotes')
      .lean();

    const volumeUsd = Number(directBusinessVolumeUsd) || 0;
    const sortedRules = Array.isArray(rules) ? rules : [];
    let currentRule = null;
    let nextRule = null;

    for (const r of sortedRules) {
      const thr = Number(r.thresholdBalance) || 0;
      if (thr <= volumeUsd) currentRule = r;
      if (thr > volumeUsd) {
        nextRule = r;
        break;
      }
    }

    // Best-effort: ensure unlocks are created when user crosses threshold via new referral.
    try {
      await evaluateRankRewardsForUser({
        userId,
        directBusinessVolumeUsd: volumeUsd,
        userEmail: user?.email
      });
    } catch {
      // ignore
    }

    res.json({
      directBusinessVolumeUsd: Math.round(volumeUsd * 100) / 100,
      rules: sortedRules,
      unlocks,
      currentRule,
      nextRule
    });
  } catch (error) {
    console.error('[RankRewards] progress error:', error);
    res.status(500).json({ error: 'Failed to load rank reward progress' });
  }
});

module.exports = router;

