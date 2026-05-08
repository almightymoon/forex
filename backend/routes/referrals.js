const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const referralService = require('../services/referralService');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/referrals/code
// @desc    Get user's referral code
// @access  Private
router.get('/code', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate referral code if doesn't exist
    const referralCode = await referralService.generateReferralCode(user);

    res.json({
      success: true,
      referralCode: referralCode,
      referralUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// @route   GET /api/referrals/tree
// @desc    Get user's referral tree
// @access  Private
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const tree = await referralService.getReferralTree(req.user._id);
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get referral tree error:', error);
    res.status(500).json({ error: 'Failed to get referral tree' });
  }
});

// @route   GET /api/referrals/earnings
// @desc    Get user's referral earnings
// @access  Private
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const earnings = await referralService.getReferralEarnings(req.user._id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    res.json({
      success: true,
      data: earnings
    });
  } catch (error) {
    console.error('Get referral earnings error:', error);
    res.status(500).json({ error: 'Failed to get referral earnings' });
  }
});

// @route   GET /api/referrals/stats
// @desc    Get user's referral statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Source of truth: compute from current referral tree (prevents double-counting
    // when users are deleted/re-added or when older referralStats are stale).
    const treeData = await referralService.getReferralTree(user._id);
    const computedStats = treeData?.stats || {
      totalReferrals: 0,
      directReferrals: 0,
      verifiedReferrals: 0,
      unverifiedReferrals: 0
    };

    const totalReferrals = Number(computedStats.totalReferrals || 0);
    const directReferrals = Number(computedStats.directReferrals || 0);
    const verifiedReferrals = Number(computedStats.verifiedReferrals || 0);
    const unverifiedReferrals = Number(computedStats.unverifiedReferrals || 0);
    const rank = referralService.getReferralRank(totalReferrals, directReferrals);

    // Level counts derived from computed tree nodes.
    const flat = referralService.flattenTree(treeData?.tree || []);
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const n of flat) {
      const lvl = Number(n.level);
      if (lvl >= 1 && lvl <= 5) levelCounts[lvl] += 1;
    }

    // Total earnings: sum from BalanceTransaction (referralCommissionService flow) – source of truth
    const BalanceTransaction = require('../models/BalanceTransaction');
    const totalEarningsAgg = await BalanceTransaction.aggregate([
      { $match: { user: user._id, type: 'referral_commission' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEarningsFromTx = totalEarningsAgg[0]?.total || 0;
    const totalEarnings = totalEarningsFromTx;

    // Pending earnings: ReferralCommission records with status 'pending' (legacy/secondary flow)
    const ReferralCommission = require('../models/ReferralCommission');
    const pendingEarnings = await ReferralCommission.aggregate([
      { $match: { referrer: user._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalReferrals,
        directReferrals,
        verifiedReferrals,
        unverifiedReferrals,
        level1Count: levelCounts[1],
        level2Count: levelCounts[2],
        level3Count: levelCounts[3],
        level4Count: levelCounts[4],
        level5Count: levelCounts[5],
        totalEarnings,
        rank,
        pendingEarnings: pendingEarnings[0]?.total || 0,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
});

// @route   GET /api/referrals/list
// @desc    Get flattened referral list with optional verified filter
// @access  Private
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const raw = String(req.query.filter || 'all').toLowerCase();
    const filter = ['all', 'verified', 'unverified'].includes(raw) ? raw : 'all';
    const { list, stats } = await referralService.getReferralList(req.user._id, filter);
    res.json({
      success: true,
      data: { list, stats }
    });
  } catch (error) {
    console.error('Get referral list error:', error);
    res.status(500).json({ error: 'Failed to get referral list' });
  }
});

module.exports = router;
