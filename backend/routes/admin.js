const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { clearFailedAttemptsByEmail } = require('../middleware/loginSecurity');
const User = require('../models/User');
const Course = require('../models/Course');
const TradingSignal = require('../models/TradingSignal');
const Payment = require('../models/Payment');
const PromoCode = require('../models/PromoCode');
const Settings = require('../models/Settings');
const Withdrawal = require('../models/Withdrawal');
const BalanceTransaction = require('../models/BalanceTransaction');
const PlatformCommissionLedger = require('../models/PlatformCommissionLedger');
const Package = require('../models/Package');
const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');
const fs = require('fs');
const path = require('path');
const NotificationTracking = require('../models/NotificationTracking');
const notificationService = require('../services/notificationService');
const referralService = require('../services/referralService');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const adminProductsRouter = require('./adminProducts');
const ActivityLog = require('../models/ActivityLog');
const zlib = require('zlib');
const { EJSON } = require('bson');
const {
  listPendingMonthlyFeeStudents,
  getMonthlyFeeStatusForUser,
  feeMonthForMonthlyFeePayment,
  resolvePackageFromPayment,
  startOfUtcMonth,
  addUtcMonths
} = require('../utils/monthlyFeeStatus');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

/** Parse admin "fee for month" (YYYY-MM or date string) → UTC month start, or null if empty/invalid. */
function parseFeeForMonthUtcStartString(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const ym = /^([0-9]{4})-([0-9]{2})$/.exec(s);
  if (ym) {
    const y = parseInt(ym[1], 10);
    const mo = parseInt(ym[2], 10) - 1;
    if (mo < 0 || mo > 11 || y < 2000 || y > 2100) return null;
    return new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return startOfUtcMonth(d);
}

// Mount admin products (CRUD + image upload)
router.use('/products', adminProductsRouter);

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// Auto-log admin mutations (best-effort)
router.use(async (req, _res, next) => {
  try {
    const method = (req.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const actor = req.user
        ? { userId: req.user._id, email: req.user.email, role: req.user.role }
        : undefined;

      await ActivityLog.create({
        actor,
        action: `admin.${method.toLowerCase()}`,
        entity: { type: 'admin_route', label: req.path },
        metadata: {
          method,
          path: req.path,
          params: req.params,
          query: req.query,
          bodyKeys: req.body ? Object.keys(req.body) : []
        },
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
        userAgent: (req.headers['user-agent'] || '').toString()
      });
    }
  } catch (e) {
    // ignore
  }
  next();
});

router.use('/monthly-progress', require('./landingMonthlyProgressRoutes'));
router.use('/new-joiners', require('./landingNewJoinersRoutes'));

// @route   GET /api/admin/activity-logs
// @desc    List activity/audit logs (admin only)
// @access  Private (Admin)
// Query: limit (<=200), skip, action, entityType, actorEmail, q
router.get('/activity-logs', async (req, res) => {
  try {
    const { limit = 50, skip = 0, action, entityType, actorEmail, q } = req.query;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const sk = Math.max(parseInt(skip, 10) || 0, 0);

    const query = {};
    if (action) query.action = action;
    if (entityType) query['entity.type'] = entityType;
    if (actorEmail) query['actor.email'] = actorEmail;
    if (q) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { action: rx },
        { 'actor.email': rx },
        { 'entity.type': rx },
        { 'entity.label': rx }
      ];
    }

    const [items, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(sk).limit(lim).lean(),
      ActivityLog.countDocuments(query)
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// @route   POST /api/admin/email-history/:id/resend
// @desc    Resend a failed email (admin only)
// @access  Private (Admin)
router.post('/email-history/:id/resend', async (req, res) => {
  try {
    const record = await NotificationTracking.findById(req.params.id)
      .populate('userId', 'email firstName lastName');
    if (!record) {
      return res.status(404).json({ error: 'Email record not found' });
    }
    if (record.channel !== 'email') {
      return res.status(400).json({ error: 'Only email records can be resent' });
    }
    if (!record.userId || !record.userId.email) {
      return res.status(400).json({ error: 'Recipient not found' });
    }

    const to = record.userId.email;
    const subject = record.title;
    const message = record.message || '';
    const isHtml = /<[a-z][\s\S]*>/i.test(message);
    const html = isHtml ? message : null;
    const text = isHtml ? message.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : message;

    const sent = await notificationService.sendEmail({
      to,
      subject,
      html: html || `<pre>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
      text: text || message,
      userId: record.userId._id,
      type: record.type
    });

    if (sent) {
      return res.json({ success: true, message: 'Email resent successfully' });
    }
    return res.status(500).json({ error: 'Resend failed', message: 'Email could not be sent (check SMTP config or recipient)' });
  } catch (error) {
    console.error('Resend email error:', error);
    return res.status(500).json({ error: 'Resend failed', message: error.message || 'Failed to resend email' });
  }
});

// @route   GET /api/admin/email-history
// @desc    List emails sent to users (admin only). Query: userId, type, status, limit, skip
// @access  Private (Admin)
router.get('/email-history', async (req, res) => {
  try {
    const { userId, type, status, limit = 50, skip = 0 } = req.query;
    const query = { channel: 'email' };
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    const [items, total] = await Promise.all([
      NotificationTracking.find(query)
        .populate('userId', 'email firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 200))
        .lean(),
      NotificationTracking.countDocuments(query)
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error('Get email history error:', error);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    // Use lean() so we can safely attach computed flags
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Compute "has bought a package" from completed package payments.
    // (Badges may exist too, but payments are the source of truth.)
    const packagePurchaserIds = await Payment.distinct('user', {
      status: 'completed',
      type: 'package'
    });
    const packageSet = new Set(packagePurchaserIds.map((id) => id.toString()));

    // Compute "has initiated a package purchase" ONLY after the user submits required proof fields.
    // (We create `draft` payments when the checkout page is opened; those should not count as pending.)
    const pendingPackagePurchaserIds = await Payment.distinct('user', {
      status: { $in: ['pending', 'processing'] },
      type: 'package',
      transactionId: { $exists: true, $ne: '' },
      paymentScreenshotUrl: { $exists: true, $ne: '' }
    });
    const pendingPackageSet = new Set(pendingPackagePurchaserIds.map((id) => id.toString()));

    const usersWithFlags = users.map((u) => {
      const id = u._id?.toString();
      // Package ownership should be derived from completed package payments (source of truth).
      // Do NOT infer from badges, since badges may exist for unrelated achievements.
      const hasPackage = id ? packageSet.has(id) : false;
      const hasPendingPackage = id ? pendingPackageSet.has(id) : false;
      const hasReferral = !!(u.parentReferralCode && String(u.parentReferralCode).trim().length > 0);

      // Access status (package-driven):
      // - active: has completed package payment (or admin/teacher)
      // - pending: has a pending package payment but not completed
      // - inactive: no package payment yet
      const role = String(u.role || '').toLowerCase();
      const privileged = role === 'admin' || role === 'teacher' || role === 'instructor';
      const accessStatus = privileged ? 'active' : (hasPackage ? 'active' : (hasPendingPackage ? 'pending' : 'inactive'));

      return {
        ...u,
        hasPackage,
        hasPendingPackage,
        accessStatus,
        hasReferral
      };
    });

    res.json(usersWithFlags);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID (admin only)
// @access  Private (Admin)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.params.id);

    // Lifetime earned:
    // - Primary (source of truth): sum of all positive balance transactions (credits/commissions/bonuses/etc.)
    // - Fallback: if older data existed without credit transactions, approximate as (current balance + total withdrawn deducted)
    const [creditsAgg, withdrawalsAgg] = await Promise.all([
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
    const currentBalance = Number(user.balance || 0);

    const lifetimeEarned = creditsTotal > 0 ? creditsTotal : (currentBalance + withdrawnTotal);

    // Rank Rewards: compute current/next rank based on lifetime earned thresholds.
    let rankRewards = { current: null, next: null };
    try {
      const rules = await RankRewardRule.find({ isActive: true })
        .sort({ thresholdBalance: 1, sortOrder: 1, createdAt: 1 })
        .select('name thresholdBalance rewardDescription rewardValue')
        .lean();
      if (Array.isArray(rules) && rules.length > 0) {
        const earned = Number(lifetimeEarned) || 0;
        let current = null;
        let next = null;
        for (const r of rules) {
          const th = Number(r.thresholdBalance) || 0;
          if (th <= earned) current = r;
          if (th > earned) {
            next = r;
            break;
          }
        }
        rankRewards = {
          current: current
            ? {
                name: current.name,
                threshold: Number(current.thresholdBalance) || 0,
                rewardDescription: current.rewardDescription,
                rewardValue: current.rewardValue || ''
              }
            : null,
          next: next
            ? {
                name: next.name,
                threshold: Number(next.thresholdBalance) || 0,
                rewardDescription: next.rewardDescription,
                rewardValue: next.rewardValue || ''
              }
            : null
        };
      }
    } catch (e) {
      // best-effort
    }

    // Direct business volume: total completed package volume brought by this user's DIRECT referrals.
    let directBusinessVolumeUsd = 0;
    try {
      const { getDirectReferralBusinessVolumeUsd } = require('../services/rankRewardService');
      directBusinessVolumeUsd = await getDirectReferralBusinessVolumeUsd(userObjectId);
    } catch (e) {
      // best-effort
    }

    res.json({ ...user, lifetimeEarned, rankRewards, directBusinessVolumeUsd });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// @route   PUT /api/admin/users/:id/email-unreachable
// @desc    Mark user's email as unreachable / stop sending emails (admin only)
// @access  Private (Admin)
router.put('/users/:id/email-unreachable', [
  body('emailUnreachable').isBoolean().withMessage('emailUnreachable must be true or false'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason max 500 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { emailUnreachable, reason } = req.body;
    user.emailUnreachable = !!emailUnreachable;
    user.emailUnreachableAt = emailUnreachable ? new Date() : undefined;
    user.emailUnreachableReason = emailUnreachable ? (reason || '') : undefined;
    await user.save();
    res.json({
      message: emailUnreachable ? 'Email marked as unreachable. No further emails will be sent.' : 'Email marked as reachable again.',
      user: { _id: user._id, email: user.email, emailUnreachable: user.emailUnreachable, emailUnreachableAt: user.emailUnreachableAt, emailUnreachableReason: user.emailUnreachableReason }
    });
  } catch (error) {
    console.error('Update email unreachable error:', error);
    res.status(500).json({ error: 'Failed to update email unreachable status' });
  }
});

// @route   GET /api/admin/users/:id/payments
// @desc    Get user's payment history (admin only)
// @access  Private (Admin)
router.get('/users/:id/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email');
    
    res.json(payments);
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Failed to fetch user payments' });
  }
});

// @route   GET /api/admin/users/:id/withdrawals
// @desc    Get user's withdrawal history (admin only)
// @access  Private (Admin)
router.get('/users/:id/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'firstName lastName');
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch user withdrawals' });
  }
});

// @route   GET /api/admin/users/:id/referrals
// @desc    Get user's referrals (admin only)
// @access  Private (Admin)
router.get('/users/:id/referrals', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find users who were referred by this user
    const referrals = await User.find({ 
      parentReferralCode: user.referralCode 
    })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(referrals);
  } catch (error) {
    console.error('Get user referrals error:', error);
    res.status(500).json({ error: 'Failed to fetch user referrals' });
  }
});

// @route   GET /api/admin/users/:id/referral-tree
// @desc    Get user's complete referral tree & rank stats (admin only)
// @access  Private (Admin)
router.get('/users/:id/referral-tree', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // The "referral leader" (upline) is the user whose referral code was used at signup.
    // That code is stored as parentReferralCode on the user.
    const referredByUser = user.parentReferralCode
      ? await User.findOne({ referralCode: user.parentReferralCode })
          .select('firstName lastName email referralCode isActive isVerified createdAt')
          .lean()
      : null;
    // Use shared referralService so admin sees the same rank / progress logic as users
    const treeData = await referralService.getReferralTree(user._id);

    // Keep backward-compatible shape expected by admin UI, but include full stats (with rank)
    res.json({
      tree: treeData.tree || [],
      stats: treeData.stats || {},
      rootUser: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        referralCode: user.referralCode,
        parentReferralCode: user.parentReferralCode || null
      }
      ,
      referredBy: referredByUser
        ? {
            _id: referredByUser._id,
            firstName: referredByUser.firstName,
            lastName: referredByUser.lastName,
            email: referredByUser.email,
            referralCode: referredByUser.referralCode,
            isActive: referredByUser.isActive,
            isVerified: referredByUser.isVerified,
            createdAt: referredByUser.createdAt
          }
        : null
    });
  } catch (error) {
    console.error('Get user referral tree error:', error);
    res.status(500).json({ error: 'Failed to fetch user referral tree' });
  }
});

function computeLegacyReferralStatsFromTree(treeData) {
  const stats = treeData?.stats || {};
  const tree = treeData?.tree || [];
  const flat = referralService.flattenTree(tree);
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const n of flat) {
    const lvl = Number(n.level);
    if (lvl >= 1 && lvl <= 5) levelCounts[lvl] += 1;
  }

  return {
    totalReferrals: Number(stats.totalReferrals || 0),
    verifiedReferrals: Number(stats.verifiedReferrals || 0),
    level1Count: levelCounts[1],
    level2Count: levelCounts[2],
    level3Count: levelCounts[3],
    level4Count: levelCounts[4],
    level5Count: levelCounts[5]
  };
}

async function computeReferralEarningsFromTx(userId) {
  const rows = await BalanceTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        $or: [
          // Primary commission rows (positive and negative rollback rows in newer flows)
          { type: 'referral_commission' },
          // Legacy rollback rows were sometimes recorded as adjustments
          {
            type: 'adjustment',
            $or: [
              { description: { $regex: /commission rollback/i } },
              { 'metadata.rollbackOfTransactionId': { $exists: true } },
              { 'metadata.rollbackSource': { $exists: true } }
            ]
          }
        ]
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return Number(rows?.[0]?.total || 0);
}

// @route   GET /api/admin/users/:id/referral-stats/preview
// @desc    Preview recalculated referralStats for a user (admin only)
// @access  Private (Admin)
router.get('/users/:id/referral-stats/preview', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName email referralStats referralCode');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const treeData = await referralService.getReferralTree(user._id);
    const recomputed = computeLegacyReferralStatsFromTree(treeData);
    const totalEarnings = await computeReferralEarningsFromTx(user._id);
    const nextStats = { ...recomputed, totalEarnings };

    const cur = user.referralStats || {};
    const fields = [
      'totalReferrals',
      'verifiedReferrals',
      'level1Count',
      'level2Count',
      'level3Count',
      'level4Count',
      'level5Count',
      'totalEarnings'
    ];

    const changes = fields.map((field) => {
      const oldValue = Number(cur?.[field] || 0);
      const newValue = Number(nextStats?.[field] || 0);
      return { field, oldValue, newValue, changed: oldValue !== newValue };
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        referralCode: user.referralCode || ''
      },
      changes,
      hasChanges: changes.some((c) => c.changed),
      nextStats
    });
  } catch (error) {
    console.error('Preview referral stats recalculation error:', error);
    res.status(500).json({ error: 'Failed to preview referral stats recalculation' });
  }
});

// @route   POST /api/admin/users/:id/referral-stats/apply
// @desc    Apply recalculated referralStats for a user (admin only)
// @access  Private (Admin)
router.post('/users/:id/referral-stats/apply', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('referralStats firstName lastName email referralCode');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const treeData = await referralService.getReferralTree(user._id);
    const recomputed = computeLegacyReferralStatsFromTree(treeData);
    const totalEarnings = await computeReferralEarningsFromTx(user._id);
    const nextStats = { ...recomputed, totalEarnings };

    user.referralStats = {
      ...(user.referralStats || {}),
      ...nextStats
    };
    await user.save();

    res.json({
      success: true,
      message: 'Referral stats recalculated and saved',
      user: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        referralCode: user.referralCode || ''
      },
      referralStats: user.referralStats
    });
  } catch (error) {
    console.error('Apply referral stats recalculation error:', error);
    res.status(500).json({ error: 'Failed to apply referral stats recalculation' });
  }
});

// @route   GET /api/admin/users/:id/transactions
// @desc    Get user's balance transaction history (admin only)
// @access  Private (Admin)
router.get('/users/:id/transactions', async (req, res) => {
  try {
    const { limit, skip, type } = req.query;
    const transactions = await BalanceTransaction.getUserTransactions(req.params.id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      type
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// @route   GET /api/admin/users/:id/monthly-fee-status
// @desc    Monthly fee policy + grace / overdue (aligned with student auth)
// @access  Private (Admin)
router.get('/users/:id/monthly-fee-status', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const status = await getMonthlyFeeStatusForUser(req.params.id);
    res.json(status);
  } catch (error) {
    console.error('Get monthly fee status error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly fee status' });
  }
});

function parseEffectiveFromMonthUtc(value) {
  if (value == null || value === '') return { date: null };
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return { error: 'effectiveFromMonth must be YYYY-MM (UTC calendar month).' };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || y < 2000 || y > 2100) return { error: 'Invalid effectiveFromMonth.' };
  return { date: new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0)) };
}

// @route   POST /api/admin/users/:id/monthly-fee-clear-access-block
// @desc    Remove “block until paid” from admin-imposed pending monthly fee; optionally cancel that pending payment
// @access  Private (Admin)
router.post('/users/:id/monthly-fee-clear-access-block', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    const cancelPending =
      req.body?.cancelPending === true || req.body?.cancelPending === 'true';

    const target = await User.findById(req.params.id).select('role firstName lastName email').lean();
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (['admin', 'teacher', 'instructor'].includes(target.role)) {
      return res.status(400).json({ success: false, error: 'Not applicable for this account type' });
    }

    let pending = await Payment.findOne({
      user: req.params.id,
      type: 'monthly_fee',
      status: 'pending',
      'metadata.accessBlockedUntilPaid': '1'
    })
      .sort({ createdAt: -1 });

    if (!pending && cancelPending) {
      pending = await Payment.findOne({
        user: req.params.id,
        type: 'monthly_fee',
        status: 'pending',
        'metadata.adminImposed': '1'
      })
        .sort({ createdAt: -1 });
    }

    if (!pending) {
      return res.status(404).json({
        success: false,
        error: cancelPending
          ? 'No admin-imposed pending monthly fee found for this user.'
          : 'No admin-blocked pending monthly fee found for this user.'
      });
    }

    if (cancelPending) {
      pending.status = 'cancelled';
      pending.metadata = pending.metadata || new Map();
      pending.metadata.set('cancelledByAdminId', String(req.user._id));
      pending.metadata.set('cancelledAt', new Date().toISOString());
      pending.metadata.set('cancelReason', 'admin_cancelled_pending');
    } else {
      pending.metadata = pending.metadata || new Map();
      pending.metadata.set('accessBlockedUntilPaid', '0');
      pending.metadata.set('accessBlockClearedByAdminId', String(req.user._id));
      pending.metadata.set('accessBlockClearedAt', new Date().toISOString());
    }
    await pending.save();

    res.json({
      success: true,
      message: cancelPending
        ? 'Pending admin monthly fee was cancelled.'
        : 'Access block removed; the user can use the app while the fee remains pending.',
      paymentId: pending._id,
      cancelled: cancelPending
    });
  } catch (error) {
    console.error('Monthly fee clear access block error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update payment' });
  }
});

// @route   PUT /api/admin/users/:id/monthly-fee-billing-anchor
// @desc    Set or clear UTC month when recurring monthly-fee obligation begins (defers prior months)
// @access  Private (Admin)
router.put('/users/:id/monthly-fee-billing-anchor', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user id' });
    }

    const target = await User.findById(req.params.id).select('role firstName lastName email').lean();
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (['admin', 'teacher', 'instructor'].includes(target.role)) {
      return res.status(400).json({ success: false, error: 'Not applicable for this account type' });
    }

    const clear =
      req.body?.clear === true ||
      req.body?.clear === 'true' ||
      req.body?.effectiveFromMonth === null ||
      req.body?.effectiveFromMonth === '';

    if (clear) {
      await User.findByIdAndUpdate(req.params.id, {
        $unset: { monthlyFeeBillingStartsMonthStart: 1 }
      });
      return res.json({
        success: true,
        message: 'Monthly fee billing start cleared (default calendar rules).',
        monthlyFeeBillingStartsMonthStart: null
      });
    }

    const parsed = parseEffectiveFromMonthUtc(req.body?.effectiveFromMonth);
    if (parsed.error) {
      return res.status(400).json({ success: false, error: parsed.error });
    }

    const hasPackage = await Payment.exists({
      user: req.params.id,
      status: 'completed',
      type: 'package'
    });
    if (!hasPackage) {
      return res.status(400).json({
        success: false,
        error: 'User has no completed package purchase; billing anchor cannot be set.'
      });
    }

    await User.findByIdAndUpdate(req.params.id, {
      $set: { monthlyFeeBillingStartsMonthStart: parsed.date }
    });

    res.json({
      success: true,
      message:
        'Monthly recurring fee will be enforced only for obligation months on or after this UTC month.',
      monthlyFeeBillingStartsMonthStart: parsed.date.toISOString()
    });
  } catch (error) {
    console.error('Monthly fee billing anchor error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save billing anchor' });
  }
});

// @route   GET /api/admin/users/:id/monthly-fee-history
// @desc    Monthly fee payments with inferred "fee for month" (UTC) + current policy snapshot
// @access  Private (Admin)
router.get('/users/:id/monthly-fee-history', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const userId = req.params.id;
    const user = await User.findById(userId).select('firstName lastName email role').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payments = await Payment.find({ user: userId, type: 'monthly_fee' })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const policy = await getMonthlyFeeStatusForUser(userId, new Date());

    const entries = payments.map((p) => {
      const { feeForMonthStart, feeForMonthLabel } = feeMonthForMonthlyFeePayment(p);
      return {
        paymentId: p._id,
        status: p.status,
        amount: p.finalAmount ?? p.amount,
        currency: p.currency || 'USD',
        createdAt: p.createdAt,
        feeForMonthStart,
        feeForMonthLabel,
        transactionId: p.transactionId || null,
        transactionHash: p.binanceWallet?.transactionHash || null,
        adminConfirmed: !!p.adminConfirmed,
        paymentMethod: p.paymentMethod,
        description: p.description || null
      };
    });

    const latestPackage = await Payment.findOne({ user: userId, type: 'package', status: 'completed' })
      .sort({ createdAt: -1 })
      .select('createdAt package finalAmount')
      .lean();

    res.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      policy,
      latestPackagePayment: latestPackage
        ? {
            purchasedAt: latestPackage.createdAt,
            packageName: latestPackage.package?.name,
            price: latestPackage.package?.price,
            finalAmount: latestPackage.finalAmount
          }
        : null,
      entries
    });
  } catch (error) {
    console.error('Get monthly fee history error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly fee history' });
  }
});

// ---------------------------------------------------------------------------
// Packages (admin-managed)
// ---------------------------------------------------------------------------

// @route   GET /api/admin/packages
// @desc    List all packages (admin only)
router.get('/packages', async (req, res) => {
  try {
    // Ensure default packages exist so the admin tab is never empty on fresh DBs
    await Package.ensureDefaults();
    const packages = await Package.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ---------------------------------------------------------------------------
// Rank Rewards (admin-managed)
// ---------------------------------------------------------------------------

// Upload (rank reward rule image)
const rankRewardUploadDir = path.join(__dirname, '..', 'uploads', 'rank-rewards');
if (!fs.existsSync(rankRewardUploadDir)) {
  fs.mkdirSync(rankRewardUploadDir, { recursive: true });
}
const rankRewardImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, rankRewardUploadDir),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const safe = (file.originalname || 'image')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();
      cb(null, `${timestamp}-${safe}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new Error('Invalid file type. Upload jpg/png/gif/webp only.'));
    cb(null, true);
  }
});

// @route   POST /api/admin/rank-rewards/rules/upload-image
// @desc    Upload a rank reward rule image (admin only)
// @access  Private (Admin)
router.post('/rank-rewards/rules/upload-image', rankRewardImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    let url = `/uploads/rank-rewards/${req.file.filename}`;
    const useCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (useCloudinary) {
      try {
        const result = await uploadImage(req.file.path, 'forex/rank-rewards');
        url = result.url;
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      } catch (e) {
        console.error('[RankReward Image] Cloudinary upload failed, using local:', e.message);
      }
    }

    res.json({ success: true, url });
  } catch (e) {
    console.error('[RankReward Image] Upload error:', e);
    res.status(500).json({ error: e.message || 'Failed to upload image' });
  }
});

// @route   GET /api/admin/rank-rewards/rules
// @desc    List rank reward rules (admin only)
router.get('/rank-rewards/rules', async (_req, res) => {
  try {
    const rules = await RankRewardRule.find({}).sort({ sortOrder: 1, thresholdBalance: 1, createdAt: 1 }).lean();
    res.json(rules);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rank reward rules' });
  }
});

// @route   POST /api/admin/rank-rewards/rules
// @desc    Create a rank reward rule (admin only)
router.post(
  '/rank-rewards/rules',
  [
    body('name').notEmpty().trim(),
    body('thresholdBalance').isFloat({ min: 0 }),
    body('rewardDescription').notEmpty().trim(),
    body('rewardValue').optional().trim(),
    body('imageUrl').optional().trim(),
    body('isActive').optional().isBoolean(),
    body('sortOrder').optional().isInt()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const created = await RankRewardRule.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create rank reward rule' });
    }
  }
);

// @route   PUT /api/admin/rank-rewards/rules/:id
// @desc    Update a rank reward rule (admin only)
router.put('/rank-rewards/rules/:id', async (req, res) => {
  try {
    if (req.body && typeof req.body.imageUrl === 'string' && req.body.imageUrl.length > 2000) {
      return res.status(400).json({ error: 'imageUrl too long' });
    }
    const updated = await RankRewardRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).lean();
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update rank reward rule' });
  }
});

// @route   DELETE /api/admin/rank-rewards/rules/:id
// @desc    Delete a rank reward rule (admin only)
router.delete('/rank-rewards/rules/:id', async (req, res) => {
  try {
    const deleted = await RankRewardRule.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete rank reward rule' });
  }
});

// @route   GET /api/admin/rank-rewards/unlocks
// @desc    List unlocked rewards (admin only). Query: status, userEmail, limit, page
router.get('/rank-rewards/unlocks', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const status = (req.query.status || '').toString().trim();
    const userEmail = (req.query.userEmail || '').toString().trim();

    const query = {};
    if (status) query.status = status;

    const userMatch = userEmail
      ? { email: new RegExp(userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      : null;

    const [total, rows] = await Promise.all([
      RankRewardUnlock.countDocuments(query),
      RankRewardUnlock.find(query)
        .populate('user', 'firstName lastName email')
        .populate('rule', 'name thresholdBalance rewardDescription rewardValue')
        .sort({ unlockedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const filtered =
      userMatch && userEmail
        ? rows.filter((r) => (r.user?.email || '').toLowerCase().includes(userEmail.toLowerCase()))
        : rows;

    res.json({
      rows: filtered,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch rank reward unlocks' });
  }
});

// @route   POST /api/admin/rank-rewards/unlocks/:id/fulfill
// @desc    Mark unlocked reward as fulfilled (admin only)
router.post(
  '/rank-rewards/unlocks/:id/fulfill',
  [body('notes').optional().trim().isLength({ max: 500 })],
  async (req, res) => {
    try {
      const doc = await RankRewardUnlock.findById(req.params.id).populate('user', 'email firstName lastName').populate('rule', 'name').exec();
      if (!doc) return res.status(404).json({ error: 'Unlock not found' });
      if (doc.status !== 'unlocked') return res.status(400).json({ error: 'Unlock is not in unlocked status' });

      doc.status = 'fulfilled';
      doc.fulfilledAt = new Date();
      doc.fulfilledBy = req.user?._id;
      doc.fulfillmentNotes = (req.body?.notes || '').toString().slice(0, 500);
      await doc.save();

      // Notify user (best-effort)
      try {
        const notificationService = require('../services/notificationService');
        await notificationService.createNotification({
          user: doc.user?._id,
          type: 'system',
          title: 'Rank reward delivered',
          message: `Your reward for "${doc.rule?.name || 'your rank'}" has been sent.`
        });
      } catch (e) {}

      res.json({ success: true, unlock: doc });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fulfill rank reward' });
    }
  }
);

// Shared: students with unpaid monthly fee this cycle (grace, overdue, or payment pending confirmation)
// Query: status=all|in_grace|grace|overdue|pending_confirmation, packageName (partial), referenceDate (ISO), dueMonth=YYYY-MM
async function getMonthlyFeePendingStudentsList(req, res) {
  try {
    const { referenceDate, status, packageName, pkg, dueMonth } = req.query;
    let now = new Date();
    if (referenceDate && String(referenceDate).trim()) {
      const d = new Date(String(referenceDate));
      if (!Number.isNaN(d.getTime())) now = d;
    } else if (dueMonth && /^\d{4}-\d{2}$/.test(String(dueMonth))) {
      const [y, mHuman] = String(dueMonth).split('-').map(Number);
      if (y && mHuman >= 1 && mHuman <= 12) {
        now = new Date(Date.UTC(y, mHuman, 15, 12, 0, 0));
      }
    }
    const pkgFilter = (packageName || pkg || '').toString().trim();
    const includeNoFeeTiers = req.query.includeNoFee !== 'false';
    const result = await listPendingMonthlyFeeStudents({
      now,
      status: (status || 'all').toString(),
      packageName: pkgFilter,
      includeNoFeeTiers
    });
    res.json(result);
  } catch (error) {
    console.error('Get monthly fee pending students error:', error);
    res.status(500).json({ error: 'Failed to fetch pending monthly fee students' });
  }
}

// @route   GET /api/admin/monthly-fee/overdue
// @route   GET /api/admin/monthly-fee/pending
// @desc    Same payload (pending + grace + overdue + pending review). Two paths so older frontends / proxies still work.
router.get('/monthly-fee/overdue', getMonthlyFeePendingStudentsList);
router.get('/monthly-fee/pending', getMonthlyFeePendingStudentsList);

// @route   POST /api/admin/packages
// @desc    Create a package (admin only)
router.post(
  '/packages',
  [
    body('name').notEmpty().trim(),
    body('price').isNumeric(),
    body('referralPoolPercentage').optional().isFloat({ min: 0, max: 1 }),
    body('monthlyFeeReferralPoolPercentage').optional({ nullable: true }).isFloat({ min: 0, max: 1 }),
    body('monthlyFeeCommissionRates').optional({ nullable: true }).isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const created = await Package.create(req.body);
      res.status(201).json(created);
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({ error: 'Failed to create package' });
    }
  }
);

// @route   PUT /api/admin/packages/:id
// @desc    Update a package (admin only)
router.put('/packages/:id', async (req, res) => {
  try {
    const updated = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) return res.status(404).json({ error: 'Package not found' });
    res.json(updated);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// @route   DELETE /api/admin/packages/:id
// @desc    Delete a package (admin only)
router.delete('/packages/:id', async (req, res) => {
  try {
    const deleted = await Package.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Package not found' });
    res.json({ message: 'Package deleted' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// @route   POST /api/admin/users/:id/credit
// @desc    Credit balance to user (admin only)
// @access  Private (Admin)
router.post('/users/:id/credit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'credit',
      amount: parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send email to user about balance credit
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance_credited', {
      amount: parseFloat(amount),
      currency: 'USDT',
      description: description,
      transactionId: transaction._id.toString(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    res.json({
      success: true,
      message: 'Balance credited successfully',
      transaction
    });

  } catch (error) {
    console.error('Credit balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to credit balance' 
    });
  }
});

// @route   POST /api/admin/users/:id/debit
// @desc    Debit balance from user (admin only)
// @access  Private (Admin)
router.post('/users/:id/debit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user.balance || 0) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'debit',
      amount: -parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance', {
      title: 'Balance Debited',
      message: `$${amount} USDT has been debited from your account. ${description}`,
      transactionId: transaction._id
    });

    res.json({
      success: true,
      message: 'Balance debited successfully',
      transaction
    });

  } catch (error) {
    console.error('Debit balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to debit balance' 
    });
  }
});

// @route   POST /api/admin/users/:id/bonus
// @desc    Send bonus to user (admin only)
// @access  Private (Admin)
router.post('/users/:id/bonus', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'bonus',
      amount: parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance', {
      title: 'Bonus Received!',
      message: `Congratulations! You've received a bonus of $${amount} USDT. ${description}`,
      transactionId: transaction._id
    });

    res.json({
      success: true,
      message: 'Bonus sent successfully',
      transaction
    });

  } catch (error) {
    console.error('Send bonus error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to send bonus' 
    });
  }
});

// @route   POST /api/admin/users/:id/grant-package
// @desc    Admin grants a package to a user and activates account
// @access  Private (Admin)
router.post(
  '/users/:id/grant-package',
  [
    body('packageId').optional().isMongoId().withMessage('packageId must be a valid id'),
    body('packageName').optional().trim().isLength({ min: 1 }).withMessage('packageName is required'),
    body('reason').optional().trim().isLength({ max: 500 }),
    body('activate').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.params.id;
      const { packageId, packageName, reason, activate } = req.body || {};

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (['admin', 'teacher', 'instructor'].includes(user.role)) {
        return res.status(400).json({ success: false, error: 'Cannot grant packages to staff accounts' });
      }

      const pkgQuery = packageId ? { _id: packageId } : { name: packageName };
      const pkg = await Package.findOne({ ...pkgQuery, isActive: true }).lean();
      if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });

      const price = Number(pkg.price ?? 0);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, error: 'Package price is not configured correctly' });
      }

      // Cancel any pending/draft package payments (avoid conflicting access state).
      await Payment.updateMany(
        { user: userId, type: 'package', status: { $in: ['draft', 'pending', 'processing'] } },
        { $set: { status: 'cancelled', failureReason: 'Cancelled by admin (package granted)' } }
      );

      const now = new Date();
      const metadata = new Map([
        ['adminGranted', '1'],
        ['grantedByAdminId', String(req.user._id)],
        ['grantedAt', now.toISOString()],
        ['reason', (reason || '').toString().slice(0, 500)],
        // Keep revenue at $0 (discount = price), but still allow commission distribution using the package price.
        ['commissionBaseAmount', String(price)]
      ]);

      const payment = await Payment.create({
        user: userId,
        amount: price,
        currency: 'USD',
        paymentMethod: 'promo_code',
        status: 'completed',
        type: 'package',
        package: { name: pkg.name, price },
        description: `Admin granted package: ${pkg.name}`,
        discountAmount: price,
        finalAmount: 0,
        transactionId: `ADMIN-GRANT-${Date.now()}`,
        adminConfirmed: true,
        confirmedBy: req.user._id,
        confirmedAt: now,
        metadata
      });

      const shouldActivate = activate !== false;
      if (shouldActivate) {
        user.isActive = true;
        user.isVerified = true;
        await user.save();
      }

      // Auto-enroll user in all published courses (same behavior as payment confirmation).
      try {
        const publishedCourses = await Course.find({
          $or: [{ isPublished: true }, { status: 'published' }]
        }).lean();

        for (const course of publishedCourses) {
          try {
            const courseDoc = await Course.findById(course._id);
            if (!courseDoc) continue;
            const isEnrolled = (courseDoc.enrolledStudents || []).some(
              (enrollment) => enrollment.student.toString() === user._id.toString()
            );
            if (!isEnrolled) {
              courseDoc.enrollStudent(user._id);
              await courseDoc.save({ validateBeforeSave: false });
            }

            const isUserEnrolled = (user.enrolledCourses || []).some(
              (enrollment) => enrollment.courseId.toString() === courseDoc._id.toString()
            );
            if (!isUserEnrolled) {
              user.enrolledCourses.push({
                courseId: courseDoc._id,
                enrolledAt: now,
                progress: 0,
                completedLessons: 0,
                totalLessons: courseDoc.content
                  ? courseDoc.content.length
                  : courseDoc.videos
                    ? courseDoc.videos.length
                    : 0,
                lastAccessed: now
              });
            }
          } catch (e) {
            // best effort
          }
        }
        await user.save();
      } catch (e) {
        // best effort
      }

      // Notify user
      try {
        await notificationService.sendNotificationToUser(userId, 'account_verified', {
          packageName: pkg.name
        });
      } catch (e) {
        // best effort
      }

      // Rank rewards: attribute package volume to DIRECT referrer (best-effort),
      // same behavior as normal package confirmation.
      try {
        const buyer = await User.findById(user._id).select('parentReferralCode email').lean();
        const parentCode = String(buyer?.parentReferralCode || '').trim();
        if (parentCode) {
          const referrer = await User.findOne({ referralCode: parentCode }).select('_id email').lean();
          if (referrer?._id) {
            const { getDirectReferralBusinessVolumeUsd, evaluateRankRewardsForUser } = require('../services/rankRewardService');
            const vol = await getDirectReferralBusinessVolumeUsd(referrer._id);
            await evaluateRankRewardsForUser({
              userId: referrer._id,
              directBusinessVolumeUsd: vol,
              userEmail: referrer.email
            });
          }
        }
      } catch (e) {
        // best effort
      }

      return res.status(201).json({
        success: true,
        message: 'Package granted successfully',
        paymentId: payment._id,
        package: { name: pkg.name, price },
        user: { _id: user._id, isActive: user.isActive, isVerified: user.isVerified }
      });
    } catch (error) {
      console.error('Grant package error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to grant package' });
    }
  }
);

// @route   POST /api/admin/users/:id/revoke-package
// @desc    Admin revokes an admin-granted package from a user (refunds the admin-grant payment)
// @access  Private (Admin)
router.post(
  '/users/:id/revoke-package',
  [
    body('paymentId').optional().isMongoId().withMessage('paymentId must be a valid id'),
    body('reason').optional().trim().isLength({ max: 500 }),
    body('rollbackCommissions').optional().isBoolean(),
    body('deactivate').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.params.id;
      const { paymentId, reason, deactivate, rollbackCommissions } = req.body || {};

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (['admin', 'teacher', 'instructor'].includes(user.role)) {
        return res.status(400).json({ success: false, error: 'Cannot revoke packages from staff accounts' });
      }

      const baseQuery = {
        user: userId,
        type: 'package',
        status: 'completed'
      };
      const payment = paymentId
        ? await Payment.findOne({ ...baseQuery, _id: paymentId })
        : await Payment.findOne(baseQuery).sort({ createdAt: -1 });

      if (!payment) {
        return res.status(404).json({ success: false, error: 'No completed package payment found for this user' });
      }

      const isAdminGranted =
        !!(payment.metadata && typeof payment.metadata.get === 'function' && payment.metadata.get('adminGranted') === '1');
      if (!isAdminGranted) {
        return res.status(400).json({
          success: false,
          error: 'Only admin-granted packages can be revoked via this action'
        });
      }

      const now = new Date();
      payment.status = 'refunded';
      payment.refundAmount = 0;
      payment.refundReason = `Admin revoked granted package${reason ? `: ${String(reason).slice(0, 500)}` : ''}`;
      payment.refundedAt = now;
      payment.refundedBy = req.user._id;
      if (!payment.metadata) payment.metadata = new Map();
      payment.metadata.set('revokedByAdminId', String(req.user._id));
      payment.metadata.set('revokedAt', now.toISOString());
      if (reason) payment.metadata.set('revokeReason', String(reason).slice(0, 500));
      payment.markModified('metadata');
      await payment.save();

      // Optional: rollback referral commissions generated by this payment
      // (audit-safe: creates negative adjustment transactions rather than deleting rows).
      let rollbackResult = { reversedCount: 0 };
      if (rollbackCommissions === true) {
        try {
          const BalanceTransaction = require('../models/BalanceTransaction');
          const commissionTxns = await BalanceTransaction.find({
            type: 'referral_commission',
            relatedPayment: payment._id
          })
            .sort({ createdAt: 1 })
            .lean();

          let reversedCount = 0;
          for (const tx of commissionTxns) {
            // Idempotency: if we already created a rollback row for this tx, skip.
            const existingRollback = await BalanceTransaction.findOne({
              type: 'referral_commission',
              relatedPayment: payment._id,
              'metadata.rollbackOfTransactionId': String(tx._id)
            })
              .select('_id')
              .lean();
            if (existingRollback?._id) continue;

            await BalanceTransaction.createTransaction({
              user: tx.user,
              type: 'referral_commission',
              amount: -Number(tx.amount || 0),
              description: 'Commission rollback (package revoked by admin)',
              relatedPayment: payment._id,
              notes: `Reversing referral commission of $${Number(tx.amount || 0).toFixed(2)} due to package revoke`,
              performedBy: req.user._id,
              metadata: new Map([
                ['rollbackOfTransactionId', String(tx._id)],
                ['rollbackSource', 'admin_revoke_package']
              ])
            });

            // Best-effort: reflect rollback in referralStats.totalEarnings
            try {
              const refUser = await User.findById(tx.user);
              if (refUser?.referralStats) {
                const cur = Number(refUser.referralStats.totalEarnings || 0);
                refUser.referralStats.totalEarnings = Math.max(0, cur - Number(tx.amount || 0));
                await refUser.save();
              }
            } catch (e) {
              // ignore
            }

            reversedCount += 1;
          }

          rollbackResult = { reversedCount };
        } catch (e) {
          // best-effort; do not block revoke if rollback fails
        }
      }

      // Cancel any pending monthly fee payments for this user (package no longer active)
      await Payment.updateMany(
        { user: userId, type: 'monthly_fee', status: { $in: ['draft', 'pending', 'processing'] } },
        { $set: { status: 'cancelled', failureReason: 'Cancelled by admin (package revoked)' } }
      );

      // Remove badge for this package if present (best-effort)
      try {
        const pkgName = payment.package?.name ? String(payment.package.name) : null;
        if (pkgName && Array.isArray(user.badges) && user.badges.length) {
          const idx = user.badges.findIndex((b) => b && b.packageName === pkgName);
          if (idx >= 0) {
            user.badges.splice(idx, 1);
          }
        }
      } catch (e) {
        // ignore
      }

      // If user has no other completed package payments, mark unverified (access becomes inactive).
      const remainingCompleted = await Payment.countDocuments({
        user: userId,
        type: 'package',
        status: 'completed'
      });
      if (remainingCompleted <= 0) {
        user.isVerified = false;
      }
      if (deactivate === true) {
        user.isActive = false;
      }
      await user.save();

      return res.json({
        success: true,
        message: 'Package revoked successfully',
        refundedPaymentId: payment._id,
        rollback: rollbackResult,
        user: { _id: user._id, isActive: user.isActive, isVerified: user.isVerified }
      });
    } catch (error) {
      console.error('Revoke package error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to revoke package' });
    }
  }
);

/**
 * Create a pending admin-imposed monthly fee for one user.
 * @returns {Promise<{ ok: true, payment: object, blockAccessUntilPaid: boolean, userName: string } | { ok: false, status: number, error: string, pendingPaymentId?: string }>}
 */
async function imposeMonthlyFeeForUser(userId, options) {
  const {
    adminUserId,
    amount: amountOverride,
    notes: notesRaw = '',
    feeForMonth: feeForMonthRaw,
    blockAccessUntilPaid = false,
    forceWithoutMonthlyFeePackage: force = false
  } = options;

  const targetUser = await User.findById(userId).select('firstName lastName email role').lean();
  if (!targetUser) {
    return { ok: false, status: 404, error: 'User not found' };
  }
  if (['admin', 'teacher', 'instructor'].includes(targetUser.role)) {
    return { ok: false, status: 400, error: 'Monthly fee cannot be imposed on staff or instructor accounts' };
  }

  const completedPackagePayment = await Payment.findOne({
    user: userId,
    status: 'completed',
    type: 'package'
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!completedPackagePayment) {
    return {
      ok: false,
      status: 400,
      error: 'User has no completed package purchase. They must buy a package before a monthly fee can be imposed.'
    };
  }

  const pkg = await resolvePackageFromPayment(completedPackagePayment);
  if (!pkg && !force) {
    return {
      ok: false,
      status: 400,
      error: 'Could not resolve package from payment. Use force if you still need to impose a fee.'
    };
  }
  if (pkg && !pkg.monthlyFeeEnabled && !force) {
    return {
      ok: false,
      status: 400,
      error: "This user's package tier has monthly fee disabled. Enable impose anyway to override."
    };
  }

  const existingPending = await Payment.findOne({
    user: userId,
    status: 'pending',
    type: 'monthly_fee'
  })
    .sort({ createdAt: -1 })
    .lean();
  if (existingPending) {
    return {
      ok: false,
      status: 400,
      error: 'User already has a pending monthly fee payment. Complete or cancel it before imposing another.',
      pendingPaymentId: existingPending._id
    };
  }

  const pkgName = (completedPackagePayment.package?.name || '').trim() || (pkg?.name || '');
  const defaultAmount = pkg ? Number(pkg.monthlyFeeAmount ?? 50) : 50;
  const amount =
    amountOverride != null && amountOverride !== '' ? Number(amountOverride) : defaultAmount;
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, status: 400, error: 'Invalid amount' };
  }

  const notes = (notesRaw && String(notesRaw).trim()) || '';

  let feeForMonthUtcStart = null;
  if (feeForMonthRaw != null && String(feeForMonthRaw).trim() !== '') {
    feeForMonthUtcStart = parseFeeForMonthUtcStartString(feeForMonthRaw);
    if (!feeForMonthUtcStart) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid fee for month. Use YYYY-MM for the UTC calendar month (e.g. 2026-04).'
      };
    }
    const earliest = new Date(Date.UTC(2000, 0, 1));
    const latest = addUtcMonths(startOfUtcMonth(new Date()), 24);
    if (
      feeForMonthUtcStart.getTime() < earliest.getTime() ||
      feeForMonthUtcStart.getTime() > latest.getTime()
    ) {
      return {
        ok: false,
        status: 400,
        error: 'Fee for month is out of allowed range (Jan 2000 through 24 months ahead, UTC).'
      };
    }
  }

  const metadata = new Map([
    ['adminImposed', '1'],
    ['accessBlockedUntilPaid', blockAccessUntilPaid ? '1' : '0'],
    ['imposedByAdminId', String(adminUserId)],
    ['imposedAt', new Date().toISOString()],
    ['notes', notes.slice(0, 500)],
    ['packageName', pkgName.slice(0, 120)]
  ]);
  if (force) {
    metadata.set('forcedNonMonthlyPackage', '1');
  }
  if (feeForMonthUtcStart) {
    metadata.set('feeForMonthStartIso', feeForMonthUtcStart.toISOString());
  }

  const feeMonthLabelForDesc = feeForMonthUtcStart
    ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        feeForMonthUtcStart
      )
    : null;
  const description = feeMonthLabelForDesc
    ? `Monthly fee (admin imposed, ${feeMonthLabelForDesc}) — $${amount.toFixed(2)}`
    : `Monthly fee (admin imposed) — $${amount.toFixed(2)}`;

  const payment = new Payment({
    user: userId,
    amount,
    currency: 'USD',
    paymentMethod: 'binance_wallet',
    status: 'pending',
    type: 'monthly_fee',
    description,
    discountAmount: 0,
    finalAmount: amount,
    metadata,
    binanceWallet: {
      walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna',
      network: 'TRC20'
    }
  });
  await payment.save();

  const userName = `${targetUser.firstName} ${targetUser.lastName}`.trim();

  try {
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await notificationService.sendNotificationToUser(admin._id, 'admin', {
        type: 'monthly_fee_pending',
        paymentId: payment._id,
        userId,
        userName,
        amount,
        adminImposed: true
      });
    }
  } catch (e) {
    console.error('Admin impose monthly fee: notify admins', e);
  }

  try {
    await notificationService.sendNotificationToUser(userId, 'balance', {
      title: 'Monthly fee required (admin)',
      message: blockAccessUntilPaid
        ? `Your administrator has added a monthly fee of $${amount.toFixed(
            2
          )} USDT. Open Monthly fee in the app and complete payment to restore full access.`
        : `Your administrator has added a monthly fee of $${amount.toFixed(
            2
          )} USDT. Open the Monthly fee page when you are ready to pay.`,
      transactionId: payment._id
    });
  } catch (e) {
    console.error('Admin impose monthly fee: notify student', e);
  }

  return { ok: true, payment, blockAccessUntilPaid, userName };
}

const imposeMonthlyFeeValidators = [
  body('amount').optional().isFloat({ min: 0.01, max: 100000 }).withMessage('Amount must be between 0.01 and 100000'),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('feeForMonth').optional().trim().isLength({ max: 32 })
];

function parseImposeMonthlyFeeBody(body) {
  return {
    blockAccessUntilPaid:
      body.blockAccessUntilPaid === true || body.blockAccessUntilPaid === 'true',
    force:
      body.forceWithoutMonthlyFeePackage === true ||
      body.forceWithoutMonthlyFeePackage === 'true',
    amount: body.amount,
    notes: body.notes,
    feeForMonth: body.feeForMonth
  };
}

// @route   POST /api/admin/users/impose-monthly-fee-bulk
// @desc    Impose monthly fee on multiple students (same options for all)
// @access  Private (Admin)
router.post(
  '/users/impose-monthly-fee-bulk',
  [
    body('userIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('Select between 1 and 100 users'),
    body('userIds.*').isMongoId().withMessage('Invalid user id in list'),
    ...imposeMonthlyFeeValidators
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const uniqueIds = [...new Set(req.body.userIds.map((id) => String(id)))];
      const opts = parseImposeMonthlyFeeBody(req.body);
      const results = [];

      for (const userId of uniqueIds) {
        const outcome = await imposeMonthlyFeeForUser(userId, {
          adminUserId: req.user._id,
          ...opts
        });
        if (outcome.ok) {
          results.push({
            userId,
            success: true,
            paymentId: outcome.payment._id,
            userName: outcome.userName,
            amount: outcome.payment.amount
          });
        } else {
          results.push({
            userId,
            success: false,
            error: outcome.error,
            pendingPaymentId: outcome.pendingPaymentId
          });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.length - succeeded;

      res.status(succeeded > 0 ? 201 : 400).json({
        success: succeeded > 0,
        message:
          failed === 0
            ? `Monthly fee imposed on ${succeeded} user${succeeded === 1 ? '' : 's'}.`
            : `Imposed on ${succeeded} of ${results.length}; ${failed} failed.`,
        summary: { total: results.length, succeeded, failed },
        results
      });
    } catch (error) {
      console.error('Bulk impose monthly fee error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to impose monthly fees'
      });
    }
  }
);

// @route   POST /api/admin/users/:id/impose-monthly-fee
// @desc    Create a pending monthly_fee payment (like student-initiated), optional immediate access block
// @access  Private (Admin)
router.post('/users/:id/impose-monthly-fee', imposeMonthlyFeeValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const opts = parseImposeMonthlyFeeBody(req.body);
    const outcome = await imposeMonthlyFeeForUser(req.params.id, {
      adminUserId: req.user._id,
      ...opts
    });

    if (!outcome.ok) {
      const payload = { success: false, error: outcome.error };
      if (outcome.pendingPaymentId) {
        payload.pendingPaymentId = outcome.pendingPaymentId;
      }
      return res.status(outcome.status).json(payload);
    }

    res.status(201).json({
      success: true,
      message: 'Monthly fee payment created for this user.',
      payment: outcome.payment,
      blockAccessUntilPaid: outcome.blockAccessUntilPaid
    });
  } catch (error) {
    console.error('Impose monthly fee error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to impose monthly fee'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user (admin only)
// @access  Private (Admin)
router.post('/users', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      country, 
      role = 'student',
      isActive = true,
      isVerified = false 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by the pre-save hook
      phone,
      country,
      role,
      isActive,
      isVerified,
      paymentMethod: 'credit_card' // Default payment method
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// @route   PUT /api/admin/users/:id/balance
// @desc    Update user balance (admin only)
// @access  Private (Admin)
router.put('/users/:id/balance', [
  body('balance').isFloat({ min: 0 }).withMessage('Balance must be a positive number'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { balance, reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldBalance = user.balance || 0;
    user.balance = balance;
    await user.save();

    // Log the balance change (optional - you could create a BalanceHistory model)
    console.log(`Admin ${req.user._id} updated balance for user ${user._id}: ${oldBalance} -> ${balance}. Reason: ${reason || 'No reason provided'}`);

    res.json({
      success: true,
      message: 'User balance updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        oldBalance
      }
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to update balance' 
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      country, 
      role, 
      isActive, 
      isVerified,
      subscription 
    } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (subscription !== undefined) user.subscription = subscription;

    // Only update password if provided
    if (password && password.trim() !== '') {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();
    
    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// @route   POST /api/admin/users/:id/unblock
// @desc    Unblock a user locked due to failed login attempts (admin only)
// @access  Private (Admin)
router.post('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wasLocked = user.security?.isLocked || (user.security?.lockedUntil && new Date(user.security.lockedUntil) > new Date());
    if (!wasLocked) {
      return res.status(400).json({ error: 'Account is not locked', message: 'This account is not currently locked.' });
    }

    // Clear lock in database
    await User.findByIdAndUpdate(req.params.id, {
      $unset: {
        'security.isLocked': 1,
        'security.lockedUntil': 1,
        'security.lockReason': 1
      },
      $set: {
        'security.failedLoginAttempts': 0
      }
    });

    // Clear in-memory failed attempts for this email (all IPs)
    clearFailedAttemptsByEmail(user.email);

    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json({ message: 'Account unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only). Optionally roll back commissions distributed from this user's payments.
// @body    { rollbackCommissions?: boolean } - If true, reverses all referral commissions paid out due to this user's completed payments, then deletes the user.
// @access  Private (Admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const rollbackCommissions = !!(req.body && req.body.rollbackCommissions) || req.query.rollbackCommissions === 'true';

    if (rollbackCommissions) {
      const BalanceTransaction = require('../models/BalanceTransaction');
      const { reversedCount, reversedDetails } = await BalanceTransaction.reverseCommissionsForUser(req.params.id);
      console.log(`[Delete User] Rolled back ${reversedCount} commission(s) for user ${user.email}`, reversedDetails);
      await User.findByIdAndDelete(req.params.id);
      return res.json({
        message: 'User deleted successfully. Commissions rolled back.',
        rollback: { reversedCount, reversedDetails }
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Note: Course management moved to Instructor Dashboard







// Note: Trading signals management moved to Instructor Dashboard





// @route   GET /api/admin/payments
// @desc    Get all payments (admin only)
// @access  Private (Admin)
router.get('/payments', async (req, res) => {
  try {
    // Hide `draft` payments by default (created when user opens checkout, before submitting proof).
    const includeDraft = String(req.query.includeDraft || '').toLowerCase() === 'true';
    const query = includeDraft ? {} : { status: { $ne: 'draft' } };
    const payments = await Payment.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// @route   PUT /api/admin/payments/:id
// @desc    Update payment status (admin only)
// @access  Private (Admin)
router.put('/payments/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = status;
    await payment.save();
    
    res.json({ message: 'Payment status updated successfully', payment });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// @route   POST /api/admin/payments/:id/send-email
// @desc    Send a templated payment email to the payment user (admin only)
// @access  Private (Admin)
router.post('/payments/:id/send-email', [
  body('template')
    .isString()
    .notEmpty()
    .withMessage('Template is required'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long'),
  body('overrideSubject').optional().trim().isLength({ max: 200 }).withMessage('Subject too long'),
  body('overrideMessage').optional().trim().isLength({ max: 5000 }).withMessage('Message too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const template = String(req.body.template || '').trim();
    const note = String(req.body.note || '').trim();

    const allowed = new Set([
      'payment_complete_required',
      'payment_unable_verify',
      'payment_rejected_retry'
    ]);
    if (!allowed.has(template)) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    const payment = await Payment.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (!payment.user?._id) {
      return res.status(400).json({ error: 'Payment has no user attached' });
    }

    const packageName =
      payment.type === 'monthly_fee'
        ? 'Monthly Fee'
        : payment.package?.name || 'Premium Package';

    // Use FRONTEND_URL login page (user will be redirected by app logic if payment pending)
    const overrideSubject = req.body.overrideSubject ? String(req.body.overrideSubject).trim() : '';
    const overrideMessage = req.body.overrideMessage ? String(req.body.overrideMessage).trim() : '';

    const notificationPayload = {
      paymentId: payment._id,
      amount: payment.finalAmount ?? payment.amount ?? 0,
      finalAmount: payment.finalAmount ?? payment.amount ?? 0,
      currency: payment.currency || 'USD',
      packageName,
      note,
      title: overrideSubject || undefined,
      message: overrideMessage || undefined
    };

    await notificationService.sendNotificationToUser(payment.user._id, template, notificationPayload);

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Admin Payment Email] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// @route   POST /api/admin/payments/:id/send-custom-email
// @desc    Send a custom email (subject + message) to the payment user (admin only)
// @access  Private (Admin)
router.post('/payments/:id/send-custom-email', [
  body('subject').isString().notEmpty().trim().isLength({ max: 200 }).withMessage('Subject is required'),
  body('message').isString().notEmpty().trim().isLength({ max: 5000 }).withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await Payment.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (!payment.user?._id) {
      return res.status(400).json({ error: 'Payment has no user attached' });
    }

    const subject = String(req.body.subject).trim();
    const message = String(req.body.message).trim();

    // Use the default notification template path with explicit title/message.
    await notificationService.sendNotificationToUser(payment.user._id, 'admin', {
      title: subject,
      message,
      paymentId: payment._id
    });

    res.json({ success: true, message: 'Custom email sent successfully' });
  } catch (error) {
    console.error('[Admin Payment Custom Email] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to send custom email' });
  }
});

// @route   DELETE /api/admin/payments
// @desc    Delete multiple payments (bulk delete) (admin only)
// @access  Private (Admin)
// Note: This route must come before /payments/:id to avoid routing conflicts
router.delete('/payments', async (req, res) => {
  console.log('[Bulk Delete Payments] Route hit:', req.method, req.path);
  console.log('[Bulk Delete Payments] Body:', req.body);
  console.log('[Bulk Delete Payments] Headers:', req.headers);
  
  try {
    const { paymentIds } = req.body;
    
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: 'No payment IDs provided or invalid format' });
    }

    // Validate that all IDs are valid MongoDB ObjectIds
    const mongoose = require('mongoose');
    const invalidIds = paymentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid payment IDs: ${invalidIds.join(', ')}` });
    }

    console.log('[Bulk Delete Payments] Deleting payment IDs:', paymentIds);
    const result = await Payment.deleteMany({ _id: { $in: paymentIds } });
    
    console.log('[Bulk Delete Payments] Deleted count:', result.deletedCount);
    res.json({ 
      message: `${result.deletedCount} payment(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete payments error:', error);
    res.status(500).json({ error: 'Failed to delete payments' });
  }
});

// @route   DELETE /api/admin/payments/:id
// @desc    Delete payment (admin only)
// @access  Private (Admin)
router.delete('/payments/:id', async (req, res) => {
  console.log('[Delete Single Payment] Route hit:', req.method, req.path);
  console.log('[Delete Single Payment] ID:', req.params.id);
  
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    
    console.log('[Delete Single Payment] Successfully deleted payment:', req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics (admin only)
// @access  Private (Admin)
router.get('/analytics', async (req, res) => {
  try {
    // Get current date and last month date
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count users this month
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: lastMonth } });
    
    // Calculate monthly growth
    const lastMonthUsers = await User.countDocuments({
      createdAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        $lt: lastMonth 
      }
    });
    
    const monthlyGrowth = lastMonthUsers > 0 
      ? Math.round(((usersThisMonth - lastMonthUsers) / lastMonthUsers) * 100)
      : 0;
    
    // Calculate total revenue
    const completedPayments = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Count active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    
    // Count total payments
    const totalPayments = await Payment.countDocuments();
    
    // Count payments this month
    const paymentsThisMonth = await Payment.countDocuments({ createdAt: { $gte: lastMonth } });
    
    // Count active promo codes
    const activePromoCodes = await PromoCode.countDocuments({ isActive: true });
    
    // Payment method breakdown
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get monthly revenue data for chart (last 6 months)
    const monthlyRevenue = [];
    const monthlyUserGrowth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Monthly revenue
      const monthRevenue = await Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      // Monthly user registrations
      const monthUsers = await User.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue[0]?.total || 0
      });
      
      monthlyUserGrowth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: monthUsers
      });
    }

    // Recent activity: merge latest user registrations and completed payments, sort by date
    const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(10).select('firstName lastName email role createdAt').lean();
    const recentPayments = await Payment.find({ status: 'completed' }).sort({ updatedAt: -1 }).limit(10).populate('user', 'firstName lastName email').lean();
    const activityItems = [
      ...recentUsers.map(u => ({
        type: 'user_registration',
        _id: u._id.toString(),
        createdAt: u.createdAt,
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
        email: u.email,
        role: u.role
      })),
      ...recentPayments.map(p => ({
        type: 'payment_received',
        _id: p._id.toString(),
        createdAt: p.updatedAt || p.createdAt,
        amount: p.amount || p.finalAmount,
        currency: p.currency || 'USD',
        userName: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : 'Unknown',
        packageName: p.package?.name || 'Signup'
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);

    const analytics = {
      totalUsers,
      totalRevenue: completedPayments[0]?.total || 0,
      monthlyGrowth,
      activeUsers,
      totalPayments,
      paymentsThisMonth,
      activePromoCodes,
      monthlyRevenue,
      monthlyUserGrowth,
      paymentMethodStats: paymentMethodStats.map(stat => ({
        method: stat._id,
        count: stat.count,
        totalAmount: stat.totalAmount
      })),
      recentActivity: activityItems
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// @route   GET /api/admin/promocodes
// @desc    Get all promo codes (admin only)
// @access  Private (Admin)
router.get('/promocodes', async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json(promoCodes);
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

// @route   POST /api/admin/promocodes
// @desc    Create new promo code (admin only)
// @access  Private (Admin)
router.post('/promocodes', async (req, res) => {
  try {
    const { 
      code, 
      discountType, 
      discountValue, 
      maxUses, 
      expiresAt, 
      description,
      isActive = true 
    } = req.body;
    
    // Set validUntil - if no expiresAt provided, set to 1 year from now
    const validUntil = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      description: description || `${discountType === 'percentage' ? discountValue + '%' : '$' + discountValue} discount`,
      discountType,
      discountValue,
      maxUses: maxUses || null,
      validUntil,
      isActive,
      createdBy: req.user._id, // Add the admin user who created it
      applicableTo: ['signup'] // Default to signup
    });
    
    await promoCode.save();
    
    res.status(201).json(promoCode);
  } catch (error) {
    console.error('Create promo code error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// @route   PUT /api/admin/promocodes/:id
// @desc    Update promo code (admin only)
// @access  Private (Admin)
router.put('/promocodes/:id', async (req, res) => {
  try {
    const { 
      code, 
      discountType, 
      discountValue, 
      maxUses, 
      expiresAt, 
      description,
      isActive 
    } = req.body;
    
    const promoCode = await PromoCode.findById(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }
    
    // Update fields
    if (code !== undefined) promoCode.code = code.toUpperCase();
    if (description !== undefined) promoCode.description = description;
    if (discountType !== undefined) promoCode.discountType = discountType;
    if (discountValue !== undefined) promoCode.discountValue = discountValue;
    if (maxUses !== undefined) promoCode.maxUses = maxUses || null;
    if (isActive !== undefined) promoCode.isActive = isActive;
    if (expiresAt !== undefined) promoCode.validUntil = new Date(expiresAt);
    
    await promoCode.save();
    
    res.json(promoCode);
  } catch (error) {
    console.error('Update promo code error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

// @route   DELETE /api/admin/promocodes/:id
// @desc    Delete promo code (admin only)
// @access  Private (Admin)
router.delete('/promocodes/:id', async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    await PromoCode.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Delete promo code error:', error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

// @route   GET /api/admin/payments/export
// @desc    Export payments as CSV (admin only)
// @access  Private (Admin)
router.get('/payments/export', async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    // Create CSV content
    const csvHeader = 'Payment ID,User Name,Email,Amount,Currency,Status,Payment Method,Date,Transaction ID\n';
    const csvRows = payments.map(payment => {
      const userName = `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim();
      const email = payment.user?.email || '';
      const date = new Date(payment.createdAt).toLocaleDateString();
      
      return `"${payment._id}","${userName}","${email}","${payment.amount}","${payment.currency}","${payment.status}","${payment.paymentMethod}","${date}","${payment.transactionId || ''}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ error: 'Failed to export payments' });
  }
});

// @route   GET /api/admin/settings
// @desc    Get platform settings (admin only)
// @access  Private (Admin)
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Format the response to match frontend expectations
    const formattedSettings = {
      general: {
        platformName: settings.platformName,
        description: settings.description,
        defaultCurrency: settings.defaultCurrency,
        timezone: settings.timezone,
        language: settings.language,
        maintenanceMode: settings.maintenanceMode,
        maintenanceAllowTeachers: settings.maintenanceAllowTeachers || false,
        defaultReferralCode: settings.defaultReferralCode || '',
        telegramInviteEnabled: settings.telegramInviteEnabled !== false,
        telegramInviteUrl: (settings.telegramInviteUrl || '').trim()
      },
      security: settings.security,
      notifications: settings.notifications,
      payments: settings.payments,
      courses: settings.courses,
      email: settings.email
    };
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update platform settings (admin only)
// @access  Private (Admin)
router.put('/settings', async (req, res) => {
  try {
    const { general, security, notifications, payments, courses, email } = req.body;
    
    // Flatten the structure to match the model
    const updateData = {
      ...general,
      security,
      notifications,
      payments,
      courses,
      email
    };
    
    const settings = await Settings.updateSettings(updateData);
    console.log('Settings updated in database:', settings.platformName);
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// @route   GET /api/admin/backup/courses
// @desc    Download a backup JSON of all courses (admin only)
// @access  Private (Admin)
router.get('/backup/courses', async (_req, res) => {
  try {
    const courses = await Course.find({}).lean();
    res.json({
      type: 'courses_backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      courses
    });
  } catch (error) {
    console.error('Courses backup error:', error);
    res.status(500).json({ error: 'Failed to create courses backup' });
  }
});

// @route   POST /api/admin/restore/courses
// @desc    Restore courses from a previously downloaded backup (admin only)
// @access  Private (Admin)
router.post(
  '/restore/courses',
  [
    body('confirmText').isString().trim().notEmpty().withMessage('confirmText is required'),
    body('backup').isObject().withMessage('backup object is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const confirmText = String(req.body.confirmText || '').trim().toUpperCase();
      if (confirmText !== 'RESTORE') {
        return res.status(400).json({ error: 'Confirmation text mismatch. Type RESTORE to continue.' });
      }

      const backup = req.body.backup || {};
      if (backup.type !== 'courses_backup' || !Array.isArray(backup.courses)) {
        return res.status(400).json({ error: 'Invalid backup file. Expected type courses_backup.' });
      }

      const ops = [];
      for (const raw of backup.courses) {
        if (!raw || !raw._id) continue;
        const _id = mongoose.Types.ObjectId.isValid(raw._id)
          ? new mongoose.Types.ObjectId(String(raw._id))
          : null;
        if (!_id) continue;

        const doc = { ...raw };
        delete doc.__v;
        // Ensure _id is ObjectId
        doc._id = _id;

        ops.push({
          replaceOne: {
            filter: { _id },
            replacement: doc,
            upsert: true
          }
        });
      }

      if (ops.length === 0) {
        return res.status(400).json({ error: 'Backup contained no valid courses to restore.' });
      }

      const result = await Course.collection.bulkWrite(ops, { ordered: false });

      res.json({
        success: true,
        message: 'Courses restored successfully.',
        result: {
          inserted: result.insertedCount || 0,
          upserted: result.upsertedCount || 0,
          modified: result.modifiedCount || 0,
          matched: result.matchedCount || 0
        }
      });
    } catch (error) {
      console.error('Courses restore error:', error);
      res.status(500).json({ error: 'Failed to restore courses', message: error.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// Full platform backup/restore (all MongoDB collections)
// ──────────────────────────────────────────────────────────────────────────────

const FULL_BACKUP_DIR = path.join(__dirname, '..', 'backups', 'full');
const fullBackupUpload = multer({ storage: multer.memoryStorage() });
const FULL_BACKUP_KEEP_LAST = Number(process.env.FULL_BACKUP_KEEP_LAST || 20);

function ensureDirExists(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function safeBackupFileName(name) {
  const raw = String(name || '');
  const base = path.basename(raw);
  if (!base.endsWith('.json.gz')) return null;
  if (!/^full-backup-\d{4}-\d{2}-\d{2}T/.test(base)) return null;
  return base;
}

function listStoredFullBackupFiles() {
  ensureDirExists(FULL_BACKUP_DIR);
  return fs.readdirSync(FULL_BACKUP_DIR).filter((f) => f.endsWith('.json.gz'));
}

function getStoredBackupSortKey(fileName) {
  // Prefer timestamp embedded in filename, else filesystem time.
  const m = String(fileName).match(/^full-backup-(.+)\.json\.gz$/);
  if (m && m[1]) return m[1];
  try {
    const stat = fs.statSync(path.join(FULL_BACKUP_DIR, fileName));
    return stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString();
  } catch {
    return '';
  }
}

function pruneStoredFullBackups(keepLast) {
  const k = Number(keepLast);
  if (!Number.isFinite(k) || k <= 0) return { deleted: 0 };
  const files = listStoredFullBackupFiles()
    .sort((a, b) => String(getStoredBackupSortKey(b)).localeCompare(String(getStoredBackupSortKey(a))));
  const toDelete = files.slice(k);
  let deleted = 0;
  for (const fileName of toDelete) {
    const safe = safeBackupFileName(fileName);
    if (!safe) continue;
    const filePath = path.join(FULL_BACKUP_DIR, safe);
    const metaPath = filePath + '.meta.json';
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      deleted += 1;
    } catch {
      // ignore
    }
  }
  return { deleted };
}

async function exportAllCollections() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB not connected');

  const collectionsInfo = await db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = (collectionsInfo || [])
    .map((c) => c?.name)
    .filter((n) => typeof n === 'string' && n.length > 0);

  const collections = {};
  const counts = {};

  for (const name of collectionNames) {
    const docs = await db.collection(name).find({}).toArray();
    collections[name] = docs;
    counts[name] = docs.length;
  }

  return { collectionNames, collections, counts };
}

async function restoreFromBackupObject(backup) {
  if (!backup || backup.type !== 'full_backup' || !backup.collections || typeof backup.collections !== 'object') {
    throw new Error('Invalid backup object (expected type full_backup)');
  }

  const db = mongoose.connection.db;
  if (!db) throw new Error('DB not connected');

  const collectionsObj = backup.collections;
  const collectionNames = Object.keys(collectionsObj);

  const restored = {};
  for (const name of collectionNames) {
    const docs = Array.isArray(collectionsObj[name]) ? collectionsObj[name] : [];
    const coll = db.collection(name);

    await coll.deleteMany({});

    let inserted = 0;
    const chunkSize = 1000;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      await coll.insertMany(chunk, { ordered: false });
      inserted += chunk.length;
    }

    restored[name] = inserted;
  }
  return restored;
}

// @route   GET /api/admin/backup/full
// @desc    Download a full backup of all collections (admin only)
// @access  Private (Admin)
router.get('/backup/full', async (_req, res) => {
  try {
    const exportedAt = new Date().toISOString();
    const { collectionNames, collections, counts } = await exportAllCollections();

    const backup = {
      type: 'full_backup',
      version: 1,
      exportedAt,
      collections,
      counts
    };

    const json = EJSON.stringify(backup);
    const gz = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
    const fileName = `full-backup-${exportedAt.replace(/[:.]/g, '-')}.json.gz`;

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Backup-Collections', String(collectionNames.length));
    res.send(gz);
  } catch (error) {
    console.error('Full backup error:', error);
    res.status(500).json({ error: 'Failed to create full backup' });
  }
});

// @route   POST /api/admin/backups/full
// @desc    Create & store a full backup on the server (admin only)
// @access  Private (Admin)
router.post('/backups/full', async (_req, res) => {
  try {
    ensureDirExists(FULL_BACKUP_DIR);
    const exportedAt = new Date().toISOString();
    const { collectionNames, collections, counts } = await exportAllCollections();
    const backup = { type: 'full_backup', version: 1, exportedAt, collections, counts };
    const json = EJSON.stringify(backup);
    const gz = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
    const fileName = `full-backup-${exportedAt.replace(/[:.]/g, '-')}.json.gz`;
    const filePath = path.join(FULL_BACKUP_DIR, fileName);
    const metaPath = filePath + '.meta.json';

    fs.writeFileSync(filePath, gz);
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          fileName,
          exportedAt,
          version: 1,
          counts,
          collectionsCount: collectionNames.length,
          sizeBytes: gz.length
        },
        null,
        2
      )
    );

    // Retention: keep only the latest N backups
    try {
      pruneStoredFullBackups(FULL_BACKUP_KEEP_LAST);
    } catch {
      // ignore
    }

    res.json({
      success: true,
      backup: {
        fileName,
        exportedAt,
        version: 1,
        counts,
        collectionsCount: collectionNames.length,
        sizeBytes: gz.length
      }
    });
  } catch (error) {
    console.error('Create stored full backup error:', error);
    res.status(500).json({ error: 'Failed to create stored full backup' });
  }
});

// @route   GET /api/admin/backups/full
// @desc    List stored full backups (admin only)
// @access  Private (Admin)
router.get('/backups/full', async (_req, res) => {
  try {
    ensureDirExists(FULL_BACKUP_DIR);
    const entries = listStoredFullBackupFiles();
    const backups = entries
      .map((fileName) => {
        const filePath = path.join(FULL_BACKUP_DIR, fileName);
        const metaPath = filePath + '.meta.json';
        let meta = null;
        try {
          if (fs.existsSync(metaPath)) {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          }
        } catch {
          meta = null;
        }
        const stat = fs.statSync(filePath);
        return {
          fileName,
          exportedAt: meta?.exportedAt || null,
          version: meta?.version || 1,
          counts: meta?.counts || null,
          collectionsCount: meta?.collectionsCount || null,
          sizeBytes: meta?.sizeBytes || stat.size,
          createdAt: stat.birthtime ? stat.birthtime.toISOString() : null
        };
      })
      .sort((a, b) => String(b.exportedAt || b.createdAt || '').localeCompare(String(a.exportedAt || a.createdAt || '')));

    res.json({ success: true, backups });
  } catch (error) {
    console.error('List stored full backups error:', error);
    res.status(500).json({ error: 'Failed to list stored full backups' });
  }
});

// @route   DELETE /api/admin/backups/full/:fileName
// @desc    Delete a stored full backup (admin only)
// @access  Private (Admin)
router.delete('/backups/full/:fileName', async (req, res) => {
  try {
    ensureDirExists(FULL_BACKUP_DIR);
    const safe = safeBackupFileName(req.params.fileName);
    if (!safe) return res.status(400).json({ error: 'Invalid backup file name' });
    const filePath = path.join(FULL_BACKUP_DIR, safe);
    const metaPath = filePath + '.meta.json';
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete backup file' });
    }
    try {
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    } catch {
      // ignore meta delete
    }
    res.json({ success: true, message: 'Backup deleted', fileName: safe });
  } catch (error) {
    console.error('Delete stored full backup error:', error);
    res.status(500).json({ error: 'Failed to delete stored full backup' });
  }
});

// @route   GET /api/admin/backups/full/:fileName
// @desc    Download a stored full backup (admin only)
// @access  Private (Admin)
router.get('/backups/full/:fileName', async (req, res) => {
  try {
    ensureDirExists(FULL_BACKUP_DIR);
    const safe = safeBackupFileName(req.params.fileName);
    if (!safe) return res.status(400).json({ error: 'Invalid backup file name' });
    const filePath = path.join(FULL_BACKUP_DIR, safe);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Download stored full backup error:', error);
    res.status(500).json({ error: 'Failed to download stored full backup' });
  }
});

// @route   POST /api/admin/restore/full/:fileName
// @desc    Restore from a stored backup file (admin only)
// @access  Private (Admin)
router.post(
  '/restore/full/:fileName',
  [body('confirmText').isString().trim().notEmpty().withMessage('confirmText is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const confirmText = String(req.body.confirmText || '').trim().toUpperCase();
      if (confirmText !== 'RESTORE') {
        return res.status(400).json({ error: 'Confirmation text mismatch. Type RESTORE to continue.' });
      }

      ensureDirExists(FULL_BACKUP_DIR);
      const safe = safeBackupFileName(req.params.fileName);
      if (!safe) return res.status(400).json({ error: 'Invalid backup file name' });
      const filePath = path.join(FULL_BACKUP_DIR, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });

      const buf = fs.readFileSync(filePath);
      const jsonText = zlib.gunzipSync(buf).toString('utf8');
      const backup = EJSON.parse(jsonText);
      const restoredCollections = await restoreFromBackupObject(backup);

      res.json({
        success: true,
        message: 'Stored full backup restored.',
        fileName: safe,
        restoredCollections,
        restoredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Restore stored full backup error:', error);
      res.status(500).json({ error: 'Failed to restore stored full backup', message: error.message });
    }
  }
);

// @route   POST /api/admin/restore/full
// @desc    Restore full backup from uploaded file (admin only)
// @access  Private (Admin)
router.post(
  '/restore/full',
  fullBackupUpload.single('backup'),
  [body('confirmText').isString().trim().notEmpty().withMessage('confirmText is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const confirmText = String(req.body.confirmText || '').trim().toUpperCase();
      if (confirmText !== 'RESTORE') {
        return res.status(400).json({ error: 'Confirmation text mismatch. Type RESTORE to continue.' });
      }

      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'Missing backup file upload (field name: backup)' });
      }

      const buf = file.buffer;
      const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
      const jsonText = (isGzip ? zlib.gunzipSync(buf) : buf).toString('utf8');
      const backup = EJSON.parse(jsonText);

      const restored = await restoreFromBackupObject(backup);

      res.json({
        success: true,
        message: 'Full backup restored.',
        restoredCollections: restored,
        restoredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Full restore error:', error);
      res.status(500).json({ error: 'Failed to restore full backup', message: error.message });
    }
  }
);

// @route   POST /api/admin/reset-user-data
// @desc    Delete all user-generated data (keep settings/packages/admin+teacher users)
// @access  Private (Admin)
router.post(
  '/reset-user-data',
  [body('confirmText').isString().trim().notEmpty().withMessage('confirmText is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const confirmText = String(req.body.confirmText || '').trim().toUpperCase();
      if (confirmText !== 'RESET') {
        return res.status(400).json({ error: 'Confirmation text mismatch. Type RESET to continue.' });
      }

      // Users to KEEP
      const keepRoles = ['admin', 'teacher', 'instructor'];
      const keepUsers = await User.find({ role: { $in: keepRoles } }).select('_id').lean();
      const keepUserIds = new Set((keepUsers || []).map((u) => u._id.toString()));

      // Models to wipe (history/user-generated)
      const Referral = require('../models/Referral');
      const ReferralCommission = require('../models/ReferralCommission');
      const Notification = require('../models/Notification');
      const CourseProgress = require('../models/CourseProgress');
      const Certificate = require('../models/Certificate');
      const StudentCertificateAssignment = require('../models/StudentCertificateAssignment');
      const TeacherCertificate = require('../models/TeacherCertificate');
      const LiveSession = require('../models/LiveSession');
      const TeacherMessage = require('../models/TeacherMessage');
      const Channel = require('../models/Channel');
      const Message = require('../models/Message');
      const MT5Account = require('../models/MT5Account');
      const MT5Trade = require('../models/MT5Trade');
      const Trade = require('../models/Trade');

      // 1) Delete all non-privileged users
      const deleteUsersResult = await User.deleteMany({ role: { $nin: keepRoles } });

      // 2) Wipe transactional/history collections
      const results = await Promise.all([
        Payment.deleteMany({}),
        Withdrawal.deleteMany({}),
        BalanceTransaction.deleteMany({}),
        Referral.deleteMany({}),
        ReferralCommission.deleteMany({}),
        Notification.deleteMany({}),
        NotificationTracking.deleteMany({}),
        ActivityLog.deleteMany({}),
        CourseProgress.deleteMany({}),
        Certificate.deleteMany({}),
        StudentCertificateAssignment.deleteMany({}),
        TeacherCertificate.deleteMany({}),
        LiveSession.deleteMany({}),
        TeacherMessage.deleteMany({}),
        Channel.deleteMany({}),
        Message.deleteMany({}),
        MT5Account.deleteMany({}),
        MT5Trade.deleteMany({}),
        Trade.deleteMany({})
      ]);

      // 3) Clean enrollments/subscriptions on courses so remaining teacher/admin users don't carry stale enrollments
      // Keep course content, just clear enrollment/progress style fields if present.
      try {
        await Course.updateMany(
          {},
          {
            $set: {
              enrolledStudents: [],
              enrollmentRequests: []
            }
          },
          { strict: false }
        );
      } catch (e) {
        // best-effort; schema may not have these fields
      }

      // 4) Clear referral stats/codes on kept users (optional but helps a true clean restart)
      const keepUserIdList = Array.from(keepUserIds);
      if (keepUserIdList.length > 0) {
        await User.updateMany(
          { _id: { $in: keepUserIdList } },
          {
            $set: {
              referralStats: {
                totalReferrals: 0,
                totalEarnings: 0,
                verifiedReferrals: 0,
                level1Count: 0,
                level2Count: 0,
                level3Count: 0,
                level4Count: 0,
                level5Count: 0
              }
            }
          },
          { strict: false }
        );
      }

      const [
        paymentsResult,
        withdrawalsResult,
        balanceTxResult,
        referralsResult,
        referralCommissionsResult,
        notificationsResult,
        notificationTrackingResult,
        activityLogsResult,
        courseProgressResult,
        certificatesResult,
        studentCertAssignResult,
        teacherCertResult,
        liveSessionsResult,
        teacherMessagesResult,
        channelsResult,
        messagesResult,
        mt5AccountsResult,
        mt5TradesResult,
        tradesResult
      ] = results;

      return res.json({
        success: true,
        message: 'User data cleared successfully. Settings/packages preserved.',
        preserved: {
          users: keepUserIdList.length,
          roles: keepRoles
        },
        deleted: {
          users: deleteUsersResult.deletedCount || 0,
          payments: paymentsResult.deletedCount || 0,
          withdrawals: withdrawalsResult.deletedCount || 0,
          balanceTransactions: balanceTxResult.deletedCount || 0,
          referrals: referralsResult.deletedCount || 0,
          referralCommissions: referralCommissionsResult.deletedCount || 0,
          notifications: notificationsResult.deletedCount || 0,
          notificationTracking: notificationTrackingResult.deletedCount || 0,
          activityLogs: activityLogsResult.deletedCount || 0,
          courseProgress: courseProgressResult.deletedCount || 0,
          certificates: certificatesResult.deletedCount || 0,
          studentCertificateAssignments: studentCertAssignResult.deletedCount || 0,
          teacherCertificates: teacherCertResult.deletedCount || 0,
          liveSessions: liveSessionsResult.deletedCount || 0,
          teacherMessages: teacherMessagesResult.deletedCount || 0,
          channels: channelsResult.deletedCount || 0,
          messages: messagesResult.deletedCount || 0,
          mt5Accounts: mt5AccountsResult.deletedCount || 0,
          mt5Trades: mt5TradesResult.deletedCount || 0,
          trades: tradesResult.deletedCount || 0
        }
      });
    } catch (error) {
      console.error('Reset user data error:', error);
      return res.status(500).json({ error: 'Failed to reset user data', message: error.message });
    }
  }
);

// @route   GET /api/admin/withdrawals
// @desc    Get all withdrawal requests (admin only)
// @access  Private (Admin)
router.get('/withdrawals', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'firstName lastName email balance')
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// @route   DELETE /api/admin/withdrawals
// @desc    Bulk delete withdrawal requests (admin only)
// @access  Private (Admin)
router.delete('/withdrawals', async (req, res) => {
  try {
    const { withdrawalIds } = req.body;
    
    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return res.status(400).json({ error: 'Withdrawal IDs are required' });
    }

    let deletedCount = 0;
    let refundedAmount = 0;

    for (const withdrawalId of withdrawalIds) {
      const withdrawal = await Withdrawal.findById(withdrawalId).populate('user');
      
      if (!withdrawal) {
        console.log(`[Bulk Delete] Withdrawal ${withdrawalId} not found, skipping`);
        continue;
      }

      // If withdrawal is pending, refund the balance to user
      if (withdrawal.status === 'pending') {
        const user = await User.findById(withdrawal.user._id);
        if (user) {
          user.balance += withdrawal.amount;
          await user.save();
          refundedAmount += withdrawal.amount;
          console.log(`[Bulk Delete] Refunded $${withdrawal.amount} to user ${user.email}`);
        }
      }

      // Delete the withdrawal
      await Withdrawal.findByIdAndDelete(withdrawalId);
      deletedCount++;
      console.log(`[Bulk Delete] Deleted withdrawal ${withdrawalId}`);
    }

    res.json({
      success: true,
      message: `${deletedCount} withdrawal(s) deleted successfully`,
      deletedCount,
      refundedAmount
    });

  } catch (error) {
    console.error('Bulk delete withdrawals error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete withdrawals' 
    });
  }
});

// @route   DELETE /api/admin/withdrawals/:id
// @desc    Delete withdrawal request (admin only)
// @access  Private (Admin)
// NOTE: This route must be registered AFTER /withdrawals (bulk delete) to avoid route conflicts
router.delete('/withdrawals/:id', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // If withdrawal is pending, refund the balance to user
    if (withdrawal.status === 'pending') {
      const user = await User.findById(withdrawal.user._id);
      if (user) {
        user.balance += withdrawal.amount;
        await user.save();
        console.log(`[Delete Withdrawal] Refunded $${withdrawal.amount} to user ${user.email}`);
      }
    }

    // Delete the withdrawal
    await Withdrawal.findByIdAndDelete(req.params.id);
    console.log(`[Delete Withdrawal] Deleted withdrawal ${req.params.id}`);

    res.json({
      success: true,
      message: 'Withdrawal deleted successfully'
    });

  } catch (error) {
    console.error('Delete withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete withdrawal' 
    });
  }
});

// @route   POST /api/admin/withdrawals/:id/complete
// @desc    Complete withdrawal (admin only)
// @access  Private (Admin)
router.post('/withdrawals/:id/complete', [
  body('transactionHash').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionHash, notes } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status === 'completed') {
      return res.status(400).json({ error: 'Withdrawal already completed' });
    }

    // Complete withdrawal
    if (transactionHash) {
      withdrawal.transactionHash = transactionHash;
    }
    await withdrawal.complete(transactionHash);

    // Send email to user about withdrawal confirmation
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(withdrawal.user._id, 'withdrawal_confirmed', {
      amount: withdrawal.amount,
      currency: withdrawal.currency || 'USDT',
      transactionHash: transactionHash || 'N/A',
      withdrawalId: withdrawal._id.toString(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    res.json({
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Complete withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to complete withdrawal' 
    });
  }
});

// @route   POST /api/admin/withdrawals/:id/reject
// @desc    Reject withdrawal (admin only)
// @access  Private (Admin)
router.post('/withdrawals/:id/reject', [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Reject withdrawal
    await withdrawal.reject(req.user._id, reason);

    // Refund balance to user
    const user = await User.findById(withdrawal.user._id);
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
    }

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(withdrawal.user._id, 'withdrawal', {
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request of $${withdrawal.amount} USDT has been rejected. Reason: ${reason}`,
      withdrawalId: withdrawal._id
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Reject withdrawal error:', error);
    if (error.name === 'ValidationError' && error.errors?.rejectionReason) {
      return res.status(400).json({
        success: false,
        error: error.errors.rejectionReason.message || 'Rejection reason cannot exceed 2000 characters'
      });
    }
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to reject withdrawal' 
    });
  }
});

// @route   GET /api/admin/commissions/backfill-missing-package/preview
// @desc    Preview package payments that have zero referral_commission rows but would pay under current Package config
// @access  Private (Admin)
router.get('/commissions/backfill-missing-package/preview', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '200'), 10) || 200, 1), 500);
    const rawIds = req.query.paymentIds ? String(req.query.paymentIds) : '';
    const paymentIds = rawIds
      ? rawIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const ReferralCommissionService = require('../services/referralCommissionService');
    const svc = new ReferralCommissionService();
    const preview = await svc.previewBackfillMissingPackageCommissions({ limit, paymentIds });
    res.json({ success: true, ...preview });
  } catch (error) {
    console.error('Backfill missing package commissions preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build backfill preview'
    });
  }
});

// @route   POST /api/admin/commissions/backfill-missing-package/apply
// @desc    Create referral commission balance transactions for given payment ids (idempotent per payment)
// @access  Private (Admin)
router.post('/commissions/backfill-missing-package/apply', async (req, res) => {
  try {
    const { paymentIds, confirm } = req.body || {};
    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        error: 'Send confirm: true only after reviewing the preview. This credits referrer balances.'
      });
    }
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'paymentIds must be a non-empty array of payment ObjectIds'
      });
    }
    const capped = paymentIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 80);

    const ReferralCommissionService = require('../services/referralCommissionService');
    const svc = new ReferralCommissionService();
    const results = await svc.applyBackfillMissingPackageCommissions(capped);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Backfill missing package commissions apply error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply backfill'
    });
  }
});

// @route   POST /api/admin/commissions/redistribute-package/preview
// @desc    Preview rolling back open referral commissions and re-paying under saved Package rules or optional proposed settings
// @access  Private (Admin)
router.post('/commissions/redistribute-package/preview', async (req, res) => {
  try {
    const { packageName, limit = 100, proposed } = req.body || {};
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 100, 1), 500);
    if (!packageName || typeof packageName !== 'string' || !packageName.trim()) {
      return res.status(400).json({ success: false, error: 'packageName is required' });
    }

    const ReferralCommissionService = require('../services/referralCommissionService');
    const svc = new ReferralCommissionService();
    const preview = await svc.previewRedistributePackageCommissions({
      packageName: packageName.trim(),
      limit: lim,
      proposed: proposed && typeof proposed === 'object' ? proposed : undefined
    });
    res.json({ success: true, ...preview });
  } catch (error) {
    console.error('Redistribute package commissions preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build redistribute preview'
    });
  }
});

// @route   POST /api/admin/commissions/redistribute-package/apply
// @desc    Roll back open referral commissions for each payment then run distributeCommissions again (uses saved Package config)
// @access  Private (Admin)
router.post('/commissions/redistribute-package/apply', async (req, res) => {
  try {
    const { paymentIds, confirm } = req.body || {};
    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        error:
          'Send confirm: true only after reviewing the preview. This adjusts referrer balances and ledger rows.'
      });
    }
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'paymentIds must be a non-empty array of payment ObjectIds'
      });
    }
    const capped = paymentIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 80);

    const ReferralCommissionService = require('../services/referralCommissionService');
    const svc = new ReferralCommissionService();
    const results = await svc.applyRedistributePackageCommissions(capped, { performedBy: req.user._id });
    res.json({ success: true, results });
  } catch (error) {
    console.error('Redistribute package commissions apply error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply redistribute'
    });
  }
});

// @route   GET /api/admin/commissions
// @desc    Get all commission distributions (admin only)
// @access  Private (Admin)
router.get('/commissions', async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      level, 
      packageName, 
      startDate, 
      endDate,
      referrerId,
      buyerId
    } = req.query;
    
    const query = { type: 'referral_commission' };
    
    // Filter by level
    if (level) {
      query['metadata.level'] = level.toString();
    }
    
    // Filter by package name
    if (packageName) {
      query['metadata.packageName'] = packageName;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Filter by referrer
    if (referrerId) {
      query.user = referrerId;
    }
    
    // Filter by buyer (from metadata)
    if (buyerId) {
      // This would require a different approach - we'd need to check metadata
      // For now, we'll filter after fetching
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get commissions with populated user and payment info
    const commissions = await BalanceTransaction.find(query)
      .populate('user', 'firstName lastName email referralCode')
      .populate('relatedPayment', 'package finalAmount status createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // If buyerId filter is provided, filter by metadata
    let filteredCommissions = commissions;
    if (buyerId) {
      filteredCommissions = commissions.filter(c => 
        c.metadata && c.metadata.buyerEmail && 
        c.metadata.buyerEmail.toLowerCase().includes(buyerId.toLowerCase())
      );
    }
    
    // Get total count for pagination
    const totalQuery = { ...query };
    if (buyerId) {
      // For buyer filter, we need to count after filtering
      const allCommissions = await BalanceTransaction.find(query)
        .populate('user', 'firstName lastName email')
        .lean();
      const filtered = allCommissions.filter(c => 
        c.metadata && c.metadata.buyerEmail && 
        c.metadata.buyerEmail.toLowerCase().includes(buyerId.toLowerCase())
      );
      var total = filtered.length;
    } else {
      var total = await BalanceTransaction.countDocuments(query);
    }
    
    // Calculate summary statistics
    const totalCommissions = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    // Get commissions by level
    const byLevel = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: '$metadata.level',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get commissions by package
    const byPackage = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: '$metadata.packageName',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    res.json({
      commissions: filteredCommissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total: totalCommissions[0] || { totalAmount: 0, totalCount: 0, avgAmount: 0 },
        byLevel: byLevel.map(item => ({
          level: item._id || 'Unknown',
          totalAmount: item.totalAmount,
          count: item.count
        })),
        byPackage: byPackage.map(item => ({
          packageName: item._id || 'Unknown',
          totalAmount: item.totalAmount,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// @route   GET /api/admin/monthly-fee-distributions
// @desc    List completed monthly fee payments with pool/platform preview and distribution status
// @access  Private (Admin)
router.get('/monthly-fee-distributions', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const { startDate, endDate } = req.query;

    const query = { type: 'monthly_fee', status: 'completed' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const ReferralCommissionService = require('../services/referralCommissionService');
    const commissionService = new ReferralCommissionService();

    const [total, payments] = await Promise.all([
      Payment.countDocuments(query),
      Payment.find(query)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const ids = payments.map((p) => p._id);
    const commissionCounts =
      ids.length === 0
        ? []
        : await BalanceTransaction.aggregate([
            { $match: { type: 'referral_commission', relatedPayment: { $in: ids } } },
            { $group: { _id: '$relatedPayment', count: { $sum: 1 } } }
          ]);
    const countByPaymentId = new Map(commissionCounts.map((c) => [String(c._id), c.count]));

    const rows = await Promise.all(
      payments.map(async (p) => {
        const uid = p.user?._id || p.user;
        const commissionCount = countByPaymentId.get(String(p._id)) || 0;
        const metaDone = ReferralCommissionService.monthlyFeeMetaIsDone(p.metadata);

        const completedPackagePayment = await Payment.findOne({
          user: uid,
          status: 'completed',
          type: 'package'
        })
          .sort({ createdAt: -1 })
          .lean();

        let packageTierName = '—';
        let poolPct = 0;
        let referralPool = 0;
        let platformShare = 0;
        let resolveError = null;

        const feeAmount = Number(p.finalAmount ?? p.amount) || 0;

        if (completedPackagePayment) {
          const pkgDoc = await resolvePackageFromPayment(completedPackagePayment);
          packageTierName =
            p.metadata?.packageName ||
            (typeof p.metadata?.get === 'function' ? p.metadata.get('packageName') : null) ||
            completedPackagePayment.package?.name ||
            pkgDoc?.name ||
            'Unknown';
          const cfg = await commissionService.getMonthlyFeeCommissionConfig(packageTierName);
          poolPct = typeof cfg.referralPoolPercentage === 'number' ? cfg.referralPoolPercentage : 0;
          referralPool = Math.round(feeAmount * poolPct * 100) / 100;
          platformShare = Math.round(feeAmount * (1 - poolPct) * 100) / 100;
        } else {
          resolveError = 'No completed package for this user — cannot resolve pool %';
        }

        const isDistributed = commissionCount > 0 || metaDone;

        return {
          paymentId: p._id,
          createdAt: p.createdAt,
          confirmedAt: p.confirmedAt,
          feeAmount,
          user: p.user || null,
          packageTierName,
          referralPoolPercentage: poolPct * 100,
          referralPool,
          platformShare,
          commissionTxnCount: commissionCount,
          isDistributed,
          metaDistributed: metaDone,
          resolveError
        };
      })
    );

    res.json({
      rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('[Monthly fee distributions] list error:', error);
    res.status(500).json({ error: 'Failed to list monthly fee distributions' });
  }
});

// @route   POST /api/admin/monthly-fee-distributions/:paymentId/distribute
// @desc    Split a completed monthly fee into referral pool payouts + platform share (same rules as package)
// @access  Private (Admin)
router.post('/monthly-fee-distributions/:paymentId/distribute', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    if (payment.type !== 'monthly_fee') {
      return res.status(400).json({ success: false, error: 'Not a monthly fee payment' });
    }
    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Payment must be completed before distribution' });
    }

    const ReferralCommissionService = require('../services/referralCommissionService');
    const commissionService = new ReferralCommissionService();
    const commissions = await commissionService.distributeMonthlyFeeCommissions(payment);

    res.json({
      success: true,
      message:
        commissions.length > 0
          ? `Distributed ${commissions.length} referral commission(s) from this monthly fee.`
          : 'Distribution recorded. No referral payouts (no pool, no referrer, default referral, or already done).',
      commissions,
      count: commissions.length
    });
  } catch (error) {
    console.error('[Monthly fee distributions] distribute error:', error);
    const msg = error.message || 'Failed to distribute monthly fee';
    const clientError =
      /no positive amount|payer user not found|cannot resolve package tier/i.test(msg);
    res.status(clientError ? 400 : 500).json({
      success: false,
      error: msg
    });
  }
});

// ---------------------------------------------------------------------------
// Logs (admin-only)
// ---------------------------------------------------------------------------

function readLastLines(filePath, maxLines = 500, maxBytes = 1024 * 512) {
  // Best-effort "tail" implementation (sync) to keep the endpoint simple.
  // Reads up to maxBytes from the end, then returns the last maxLines.
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const start = Math.max(0, size - maxBytes);
  const length = size - start;
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, start);
    const text = buf.toString('utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.slice(Math.max(0, lines.length - maxLines));
  } finally {
    fs.closeSync(fd);
  }
}

// @route   GET /api/admin/logs
// @desc    Get server log lines (admin only)
// @access  Private (Admin)
// Query:
//   - source: "app" | "access" (default "app")
//   - limit: number of lines (default 500, max 5000)
//   - search: substring filter (optional)
router.get('/logs', async (req, res) => {
  try {
    const source = (req.query.source || 'app').toString();
    const limitRaw = parseInt((req.query.limit || '500').toString(), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 500;
    const search = (req.query.search || '').toString().trim();

    const logDir = path.join(__dirname, '..', 'logs');
    const fileName = source === 'access' ? 'access.log' : 'app.log';
    const filePath = path.join(logDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.json({
        source,
        fileName,
        lines: [],
        message: 'Log file not found yet'
      });
    }

    let lines = readLastLines(filePath, limit);
    if (search) {
      const q = search.toLowerCase();
      lines = lines.filter((l) => l.toLowerCase().includes(q));
    }

    // Return newest first for UI convenience
    lines = lines.reverse();

    res.json({
      source,
      fileName,
      lines,
      count: lines.length
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// @route   GET /api/admin/platform-commissions
// @desc    Get platform commissions (company share from all payments)
// @access  Private (Admin)
router.get('/platform-commissions', async (req, res) => {
  try {
    const { limit = 50, page = 1, packageName, startDate, endDate } = req.query;
    
    console.log('[Platform Commissions] Fetching platform commissions with filters:', {
      limit,
      page,
      packageName,
      startDate,
      endDate
    });
    
    const query = { type: 'package', status: 'completed' };
    
    // Debug: check if there are any package payments at all
    const allPackagePayments = await Payment.find({ type: 'package' })
      .select('status package.name finalAmount amount adminConfirmed')
      .lean();
    console.log('[Platform Commissions] All package payments (any status):', allPackagePayments.length);
    
    if (packageName) query['package.name'] = packageName;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const payments = await Payment.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const ReferralCommissionService = require('../services/referralCommissionService');
    const commissionService = new ReferralCommissionService();

    // Pull current referral pool configuration from DB (admin Packages tab updates this).
    const activePackages = await Package.find({ isActive: true })
      .select('name referralPoolPercentage')
      .lean();
    const poolPctByName = new Map(
      (activePackages || []).map((p) => [String(p.name), Number(p.referralPoolPercentage)])
    );

    const getPoolPct = (pkgNameRaw) => {
      const trimmed = String(pkgNameRaw || '').trim();
      let fromDb = poolPctByName.get(trimmed);
      if (typeof fromDb === 'number' && !Number.isNaN(fromDb)) return fromDb;
      const normalized = commissionService.normalizePackageName(pkgNameRaw);
      fromDb = poolPctByName.get(normalized);
      if (typeof fromDb === 'number' && !Number.isNaN(fromDb)) return fromDb;
      return 0;
    };
    
    const platformCommissions = payments.map((payment) => {
      const pkgName = payment.package?.name || 'Unknown';
      const pkgAmount = payment.finalAmount || payment.amount || 0;
      const poolPct = getPoolPct(pkgName);
      const referralPool = Math.round((pkgAmount * poolPct) * 100) / 100;
      const companyShare = Math.round((pkgAmount * (1 - poolPct)) * 100) / 100;
      const poolPctDisplay = poolPct * 100;
      
      return {
        _id: payment._id,
        paymentId: payment._id,
        user: payment.user || { firstName: 'Unknown', lastName: '', email: '' },
        package: payment.package || { name: 'Unknown', price: 0 },
        packageAmount: pkgAmount,
        referralPool,
        platformCommission: companyShare,
        referralPoolPercentage: poolPctDisplay,
        platformCommissionPercentage: 100 - poolPctDisplay,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt
      };
    });
    
    const total = await Payment.countDocuments(query);
    
    // Stats
    const allCompleted = await Payment.find({ type: 'package', status: 'completed' }).lean();
    let totalPlatformCommission = 0;
    let totalReferralPool = 0;
    let totalPackageAmount = 0;
    const byPackage = {};
    
    allCompleted.forEach((payment) => {
      const pkgName = payment.package?.name || 'Unknown';
      const pkgAmount = payment.finalAmount || payment.amount || 0;
      const poolPct = getPoolPct(pkgName);
      const refPool = Math.round((pkgAmount * poolPct) * 100) / 100;
      const companyShare = Math.round((pkgAmount * (1 - poolPct)) * 100) / 100;
      
      totalPlatformCommission += companyShare;
      totalReferralPool += refPool;
      totalPackageAmount += pkgAmount;
      
      if (!byPackage[pkgName]) byPackage[pkgName] = { totalAmount: 0, platformCommission: 0, referralPool: 0, count: 0 };
      byPackage[pkgName].totalAmount += pkgAmount;
      byPackage[pkgName].platformCommission += companyShare;
      byPackage[pkgName].referralPool += refPool;
      byPackage[pkgName].count += 1;
    });

    const ledgerBalance = await PlatformCommissionLedger.getCurrentBalance();
    
    res.json({
      commissions: platformCommissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total: {
          totalPlatformCommission: Math.round(totalPlatformCommission * 100) / 100,
          totalReferralPool: Math.round(totalReferralPool * 100) / 100,
          totalPackageAmount: Math.round(totalPackageAmount * 100) / 100,
          totalCount: allCompleted.length
        },
        byPackage: Object.entries(byPackage).map(([name, data]) => ({
          packageName: name,
          totalAmount: Math.round(data.totalAmount * 100) / 100,
          platformCommission: Math.round(data.platformCommission * 100) / 100,
          referralPool: Math.round(data.referralPool * 100) / 100,
          count: data.count
        })),
        ledger: {
          currentBalance: ledgerBalance
        }
      }
    });
  } catch (error) {
    console.error('[Platform Commissions] Error:', error);
    console.error('[Platform Commissions] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch platform commissions',
      message: error.message
    });
  }
});

// @route   GET /api/admin/platform-commission-ledger
// @desc    Paginated manual platform commission ledger (admin credit/debit)
// @access  Private (Admin)
router.get('/platform-commission-ledger', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [entries, total, currentBalance] = await Promise.all([
      PlatformCommissionLedger.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'firstName lastName email')
        .lean(),
      PlatformCommissionLedger.countDocuments(),
      PlatformCommissionLedger.getCurrentBalance()
    ]);

    res.json({
      currentBalance,
      entries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('[Platform Commission Ledger] List error:', error);
    res.status(500).json({ error: 'Failed to fetch platform commission ledger' });
  }
});

// @route   POST /api/admin/platform-commission/credit
// @desc    Credit platform commission ledger (admin)
// @access  Private (Admin)
router.post('/platform-commission/credit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { amount, description, notes } = req.body;
    const transaction = await PlatformCommissionLedger.createEntry({
      type: 'credit',
      amount: parseFloat(amount),
      description,
      notes,
      performedBy: req.user._id
    });
    const populated = await PlatformCommissionLedger.findById(transaction._id)
      .populate('performedBy', 'firstName lastName email')
      .lean();
    res.json({
      success: true,
      message: 'Platform commission credited successfully',
      transaction: populated
    });
  } catch (error) {
    console.error('[Platform Commission Ledger] Credit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to credit platform commission'
    });
  }
});

// @route   POST /api/admin/platform-commission/debit
// @desc    Debit platform commission ledger (admin)
// @access  Private (Admin)
router.post('/platform-commission/debit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { amount, description, notes } = req.body;
    const transaction = await PlatformCommissionLedger.createEntry({
      type: 'debit',
      amount: parseFloat(amount),
      description,
      notes,
      performedBy: req.user._id
    });
    const populated = await PlatformCommissionLedger.findById(transaction._id)
      .populate('performedBy', 'firstName lastName email')
      .lean();
    res.json({
      success: true,
      message: 'Platform commission debited successfully',
      transaction: populated
    });
  } catch (error) {
    console.error('[Platform Commission Ledger] Debit error:', error);
    const msg = error.message || 'Failed to debit platform commission';
    const status = msg.includes('Insufficient') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: msg
    });
  }
});

module.exports = router;
