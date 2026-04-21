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
const fs = require('fs');
const path = require('path');
const NotificationTracking = require('../models/NotificationTracking');
const notificationService = require('../services/notificationService');
const referralService = require('../services/referralService');
const { body, validationResult } = require('express-validator');
const adminProductsRouter = require('./adminProducts');
const ActivityLog = require('../models/ActivityLog');
const {
  listPendingMonthlyFeeStudents,
  getMonthlyFeeStatusForUser,
  feeMonthCoveredForPaymentDate,
  resolvePackageFromPayment
} = require('../utils/monthlyFeeStatus');

const router = express.Router();

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

    res.json({ ...user, lifetimeEarned });
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
      const { feeForMonthStart, feeForMonthLabel } = feeMonthCoveredForPaymentDate(p.createdAt);
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
    body('referralPoolPercentage').optional().isFloat({ min: 0, max: 1 })
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

// @route   POST /api/admin/users/:id/impose-monthly-fee
// @desc    Create a pending monthly_fee payment (like student-initiated), optional immediate access block
// @access  Private (Admin)
router.post('/users/:id/impose-monthly-fee', [
  body('amount').optional().isFloat({ min: 0.01, max: 100000 }).withMessage('Amount must be between 0.01 and 100000'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const blockAccessUntilPaid =
      req.body.blockAccessUntilPaid === true || req.body.blockAccessUntilPaid === 'true';
    const force = req.body.forceWithoutMonthlyFeePackage === true || req.body.forceWithoutMonthlyFeePackage === 'true';

    const targetUser = await User.findById(req.params.id).select('firstName lastName email role').lean();
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (['admin', 'teacher', 'instructor'].includes(targetUser.role)) {
      return res.status(400).json({ success: false, error: 'Monthly fee cannot be imposed on staff or instructor accounts' });
    }

    const completedPackagePayment = await Payment.findOne({
      user: req.params.id,
      status: 'completed',
      type: 'package'
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!completedPackagePayment) {
      return res.status(400).json({
        success: false,
        error: 'User has no completed package purchase. They must buy a package before a monthly fee can be imposed.'
      });
    }

    const pkg = await resolvePackageFromPayment(completedPackagePayment);
    if (!pkg && !force) {
      return res.status(400).json({
        success: false,
        error: 'Could not resolve package from payment. Use force if you still need to impose a fee.'
      });
    }
    if (pkg && !pkg.monthlyFeeEnabled && !force) {
      return res.status(400).json({
        success: false,
        error: 'This user\'s package tier has monthly fee disabled. Pass forceWithoutMonthlyFeePackage: true to impose anyway.'
      });
    }

    const existingPending = await Payment.findOne({
      user: req.params.id,
      status: 'pending',
      type: 'monthly_fee'
    })
      .sort({ createdAt: -1 })
      .lean();
    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: 'User already has a pending monthly fee payment. Complete or cancel it before imposing another.',
        pendingPaymentId: existingPending._id
      });
    }

    const pkgName = (completedPackagePayment.package?.name || '').trim() || (pkg?.name || '');
    const defaultAmount = pkg ? Number(pkg.monthlyFeeAmount ?? 50) : 50;
    const amount = req.body.amount != null && req.body.amount !== ''
      ? Number(req.body.amount)
      : defaultAmount;
    if (!Number.isFinite(amount) || amount < 0.01) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const notes = (req.body.notes && String(req.body.notes).trim()) || '';

    const metadata = new Map([
      ['adminImposed', '1'],
      ['accessBlockedUntilPaid', blockAccessUntilPaid ? '1' : '0'],
      ['imposedByAdminId', String(req.user._id)],
      ['imposedAt', new Date().toISOString()],
      ['notes', notes.slice(0, 500)],
      ['packageName', pkgName.slice(0, 120)]
    ]);
    if (force) {
      metadata.set('forcedNonMonthlyPackage', '1');
    }

    const payment = new Payment({
      user: req.params.id,
      amount,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      status: 'pending',
      type: 'monthly_fee',
      description: `Monthly fee (admin imposed) — $${amount.toFixed(2)}`,
      discountAmount: 0,
      finalAmount: amount,
      metadata,
      binanceWallet: {
        walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna',
        network: 'TRC20'
      }
    });
    await payment.save();

    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'monthly_fee_pending',
          paymentId: payment._id,
          userId: req.params.id,
          userName: `${targetUser.firstName} ${targetUser.lastName}`,
          amount,
          adminImposed: true
        });
      }
    } catch (e) {
      console.error('Admin impose monthly fee: notify admins', e);
    }

    try {
      await notificationService.sendNotificationToUser(req.params.id, 'balance', {
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

    res.status(201).json({
      success: true,
      message: 'Monthly fee payment created for this user.',
      payment,
      blockAccessUntilPaid
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
        maintenanceAllowTeachers: settings.maintenanceAllowTeachers || false
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
          const cfg = await commissionService.getCommissionConfig(packageTierName);
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
      const normalized = commissionService.normalizePackageName(pkgNameRaw);
      // Prefer DB-configured package percentage; fallback to 0 if missing.
      const fromDb = poolPctByName.get(normalized);
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
