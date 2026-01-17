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
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      level4Count: 0,
      level5Count: 0
    };

    // Get pending earnings
    const ReferralCommission = require('../models/ReferralCommission');
    const pendingEarnings = await ReferralCommission.aggregate([
      { $match: { referrer: user._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        pendingEarnings: pendingEarnings[0]?.total || 0,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
});

module.exports = router;
