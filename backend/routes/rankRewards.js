const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');
const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');

const router = express.Router();

// @route   GET /api/rank-rewards/progress
// @desc    Student rank reward progress (rules + unlocks + lifetime earned)
// @access  Private
router.get('/progress', async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [user, creditsAgg, withdrawalsAgg] = await Promise.all([
      User.findById(userId).select('balance').lean(),
      BalanceTransaction.aggregate([
        { $match: { user: userObjectId, amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      BalanceTransaction.aggregate([
        { $match: { user: userObjectId, type: 'withdrawal', amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$amount', -1] } } } }
      ])
    ]);

    const creditsTotal = Number(creditsAgg?.[0]?.total || 0);
    const withdrawnTotal = Number(withdrawalsAgg?.[0]?.total || 0);
    const currentBalance = Number(user?.balance || 0);
    const lifetimeEarned = creditsTotal > 0 ? creditsTotal : currentBalance + withdrawnTotal;

    const rules = await RankRewardRule.find({ isActive: true })
      .sort({ thresholdBalance: 1, sortOrder: 1, createdAt: 1 })
      .lean();

    const unlocks = await RankRewardUnlock.find({ user: userId })
      .select('rule status unlockedAt fulfilledAt thresholdBalance balanceAtUnlock fulfillmentNotes')
      .lean();

    const earned = Number(lifetimeEarned) || 0;
    const sortedRules = Array.isArray(rules) ? rules : [];
    let currentRule = null;
    let nextRule = null;

    for (const r of sortedRules) {
      const thr = Number(r.thresholdBalance) || 0;
      if (thr <= earned) currentRule = r;
      if (thr > earned) {
        nextRule = r;
        break;
      }
    }

    res.json({
      lifetimeEarned: Math.round(earned * 100) / 100,
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

