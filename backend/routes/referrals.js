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

    const stats = user.referralStats || {
      totalReferrals: 0,
      totalEarnings: 0,
      verifiedReferrals: 0,
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      level4Count: 0,
      level5Count: 0
    };

    const verifiedReferrals = typeof stats.verifiedReferrals === 'number' ? stats.verifiedReferrals : 0;
    const totalReferrals = stats.totalReferrals || 0;
    const directReferrals = stats.level1Count ?? stats.directReferrals ?? 0;
    const unverifiedReferrals = Math.max(0, totalReferrals - verifiedReferrals);
    const rank = referralService.getReferralRank(totalReferrals, directReferrals);

    // Total earnings: sum from BalanceTransaction (referralCommissionService flow) – source of truth
    const BalanceTransaction = require('../models/BalanceTransaction');
    const totalEarningsAgg = await BalanceTransaction.aggregate([
      { $match: { user: user._id, type: 'referral_commission' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEarningsFromTx = totalEarningsAgg[0]?.total || 0;
    const totalEarnings = totalEarningsFromTx > 0 ? totalEarningsFromTx : (stats.totalEarnings || 0);

    // Pending earnings: ReferralCommission records with status 'pending' (legacy/secondary flow)
    const ReferralCommission = require('../models/ReferralCommission');
    const pendingEarnings = await ReferralCommission.aggregate([
      { $match: { referrer: user._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        totalEarnings,
        verifiedReferrals,
        unverifiedReferrals,
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
