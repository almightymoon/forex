const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const PaymentProcessor = require('../services/paymentProcessor');
const Package = require('../models/Package');
const {
  resolvePackageFromPayment,
  getMonthlyFeeStatusForUser,
  feeMonthForMonthlyFeePayment
} = require('../utils/monthlyFeeStatus');
const { uploadImage } = require('../config/cloudinary');
const { logActivity } = require('../services/activityLogService');

const router = express.Router();

// Multer for payment screenshot upload (uses env Cloudinary in uploadImage)
const paymentScreenshotDir = path.join(__dirname, '..', 'uploads', 'payment-screenshots');
if (!fs.existsSync(paymentScreenshotDir)) {
  fs.mkdirSync(paymentScreenshotDir, { recursive: true });
}
const paymentScreenshotUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentScreenshotDir),
    filename: (_req, file, cb) => cb(null, `screenshot-${Date.now()}-${(file.originalname || 'image').replace(/\s+/g, '-')}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed for the screenshot.'));
  }
});
const paymentProcessor = new PaymentProcessor();

// @route   GET /api/payments
// @desc    Get all payments (admin only)
// @access  Private/Admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// @route   GET /api/payments/user
// @desc    Get user's payments
// @access  Private
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// @route   GET /api/payments/monthly-fee
// @desc    Student: monthly fee policy snapshot + history + current pending (if any)
// @access  Private — keep before GET /:id so "monthly-fee" is never parsed as an id
router.get('/monthly-fee', authenticateToken, async (req, res) => {
  try {
    const policy = await getMonthlyFeeStatusForUser(req.user._id);
    const userId = req.user._id;

    const [entriesRaw, pendingPayment] = await Promise.all([
      Payment.find({ user: userId, type: 'monthly_fee' }).sort({ createdAt: -1 }).limit(100).lean(),
      Payment.findOne({ user: userId, status: 'pending', type: 'monthly_fee' }).sort({ createdAt: -1 }).lean()
    ]);

    const entries = entriesRaw.map((p) => {
      const { feeForMonthStart, feeForMonthLabel, feeDueByIso, feeDueByLabel } =
        feeMonthForMonthlyFeePayment(p);
      return {
        paymentId: p._id,
        status: p.status,
        amount: p.finalAmount ?? p.amount,
        currency: p.currency || 'USD',
        createdAt: p.createdAt,
        feeForMonthStart,
        feeForMonthLabel,
        feeDueByIso,
        feeDueByLabel,
        transactionId: p.transactionId || null,
        paymentScreenshotUrl: p.paymentScreenshotUrl || null,
        adminConfirmed: !!p.adminConfirmed
      };
    });

    const pendingRows = entries.filter((e) => e.status === 'pending');

    let dueMonthLabel = null;
    if (policy.dueForMonth) {
      dueMonthLabel = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(policy.dueForMonth));
    }

    let cycleObligation = 'not_applicable';
    const feePortalApplies =
      policy.applies && (policy.monthlyFeeEnabled !== false || policy.adminImposedAccessBlock);
    if (feePortalApplies) {
      if (policy.paidForCurrentCycle) {
        cycleObligation = 'paid';
      } else if (pendingPayment?.paymentScreenshotUrl) {
        cycleObligation = 'awaiting_admin';
      } else if (pendingPayment) {
        cycleObligation = 'portal_open';
      } else if (policy.withinFullFreeWindow || policy.requiredMonthWaived) {
        cycleObligation = 'waived_or_free_window';
      } else {
        cycleObligation = 'payment_needed';
      }
    }

    const cycleSummary = {
      dueMonthIso: policy.dueForMonth || null,
      dueMonthLabel,
      amountUsd: typeof policy.monthlyFeeAmount === 'number' ? policy.monthlyFeeAmount : null,
      graceDays: policy.graceDays,
      withinGracePeriod: !!policy.withinGracePeriod,
      withinFullFreeWindow: !!policy.withinFullFreeWindow,
      requiredMonthWaived: !!policy.requiredMonthWaived,
      daysOverdue: policy.daysOverdue || 0,
      isAccessBlocked: !!(policy.isAccessBlocked || policy.adminImposedAccessBlock),
      paidForCurrentCycle: !!policy.paidForCurrentCycle,
      obligation: cycleObligation,
      pendingPaymentCount: pendingRows.length
    };

    res.json({ policy, entries, pendingPayment, cycleSummary, pendingRows });
  } catch (error) {
    console.error('Get student monthly fee summary error:', error);
    res.status(500).json({ error: 'Failed to load monthly fee information' });
  }
});

const receiptService = require('../services/receiptService');

// @route   GET /api/payments/receipts
// @desc    List downloadable receipts for the current user (join + completed payments)
// @access  Private — keep before GET /:id
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const payload = await receiptService.listReceiptsForUser(req.user._id);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('List receipts error:', error);
    res.status(500).json({ error: 'Failed to load receipts' });
  }
});

// @route   GET /api/payments/receipts/join
// @desc    Download membership / join PDF receipt
// @access  Private
router.get('/receipts/join', authenticateToken, async (req, res) => {
  try {
    const buffer = await receiptService.generateJoinReceiptPdf(req.user);
    const filename = receiptService.receiptFilename(receiptService.joinReceiptNumber(req.user));
    return receiptService.sendPdf(res, buffer, filename);
  } catch (error) {
    console.error('Join receipt error:', error);
    res.status(500).json({ error: 'Failed to generate join receipt' });
  }
});

// @route   GET /api/payments/:id/receipt
// @desc    Download PDF receipt for a completed payment (id or transactionId)
// @access  Private (owner or admin)
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const payment = await receiptService.findCompletedPaymentByRef(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Receipt not available. Payment must be completed.' });
    }
    if (!receiptService.canAccessPayment(req.user, payment)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const buffer = await receiptService.generatePaymentReceiptPdf(payment);
    const filename = receiptService.receiptFilename(receiptService.receiptNumberForPayment(payment));
    return receiptService.sendPdf(res, buffer, filename);
  } catch (error) {
    console.error('Payment receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// @route   GET /api/payments/methods
// @desc    Get available payment methods
// @access  Public — must be before GET /:id
router.get('/methods', async (req, res) => {
  try {
    const methods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or American Express',
        icon: 'credit-card',
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP', 'PKR']
      },
      {
        id: 'jazzcash',
        name: 'JazzCash',
        description: 'Pay using JazzCash mobile wallet',
        icon: 'mobile',
        enabled: true,
        currencies: ['PKR']
      },
      {
        id: 'easypaisa',
        name: 'EasyPaisa',
        description: 'Pay using EasyPaisa mobile wallet',
        icon: 'mobile',
        enabled: true,
        currencies: ['PKR']
      }
    ];

    res.json({
      success: true,
      methods: methods.filter((method) => method.enabled)
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// @route   GET /api/payments/stats/summary
// @desc    Get payment statistics (admin only)
// @access  Private/Admin — must be before GET /:id
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Payment.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// @route   POST /api/payments/create
// @desc    Create a new payment for package purchase
// @access  Private
router.post('/create', [
  authenticateToken,
  body('packageName').notEmpty().withMessage('Package name is required'),
  // packagePrice is ignored (server uses DB price), kept optional for backward compatibility
  body('packagePrice').optional().isNumeric().withMessage('Package price must be numeric'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { packageName, promoCode, discount = 0, paymentMethod } = req.body;
    const User = require('../models/User');
    const PromoCode = require('../models/PromoCode');
    const notificationService = require('../services/notificationService');

    // Load package from DB (admin-managed)
    const pkg = await Package.findOne({ name: packageName, isActive: true }).lean();
    if (!pkg) {
      return res.status(400).json({
        error: 'Invalid package',
        message: 'Selected package is not available'
      });
    }
    const packagePrice = Number(pkg.price ?? 0);
    if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
      return res.status(400).json({
        error: 'Invalid package configuration',
        message: 'Package price is not configured correctly'
      });
    }

    // Check if user already has a draft/pending payment for this package
    const existingPayment = await Payment.findOne({
      user: req.user._id,
      status: { $in: ['draft', 'pending'] },
      'package.name': packageName
    });

    if (existingPayment) {
      // Treat "already started" as success so the client can continue to the same checkout/paymentId
      // (prevents spamming new draft records and avoids 400s on repeated clicks / reloads).
      return res.status(200).json({
        message: 'Payment already started.',
        payment: {
          _id: existingPayment._id,
          amount: existingPayment.amount,
          finalAmount: existingPayment.finalAmount,
          currency: existingPayment.currency,
          status: existingPayment.status,
          package: existingPayment.package,
          binanceWallet: existingPayment.binanceWallet,
          createdAt: existingPayment.createdAt
        }
      });
    }

    // Validate promo code if provided
    let promoCodeData = null;
    if (promoCode) {
      try {
        promoCodeData = await PromoCode.findOne({ 
          code: promoCode.toUpperCase(),
          isActive: true 
        });

        if (!promoCodeData) {
          return res.status(400).json({ error: 'Invalid promo code' });
        }

        // Check if promo code is valid for this order
        if (promoCodeData.minOrderAmount && packagePrice < promoCodeData.minOrderAmount) {
          return res.status(400).json({ 
            error: `Minimum order amount for this promo code is $${promoCodeData.minOrderAmount}` 
          });
        }
      } catch (promoError) {
        console.error('Error validating promo code:', promoError);
      }
    }

    const finalAmount = packagePrice - discount;
    if (finalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount after discount' });
    }

    // Create payment record
    const payment = new Payment({
      user: req.user._id,
      amount: packagePrice,
      currency: 'USD',
      paymentMethod: paymentMethod || 'binance_wallet',
      // IMPORTANT: don't alert admins until user submits proof fields.
      status: 'draft',
      type: 'package',
      package: {
        name: packageName,
        price: packagePrice
      },
      description: `Package purchase: ${packageName}`,
      discountAmount: discount,
      finalAmount: finalAmount,
      promoCode: promoCodeData ? promoCodeData._id : undefined,
      binanceWallet: {
        walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna',
        network: 'TRC20'
      }
    });

    await payment.save();

    await logActivity({
      req,
      actor: { userId: req.user._id, email: req.user.email, role: req.user.role },
      action: 'payment.created',
      entity: { type: 'payment', id: payment._id, label: `payment:${payment._id}` },
      metadata: {
        type: payment.type,
        status: payment.status,
        packageName,
        finalAmount,
        userId: req.user._id?.toString?.() || req.user._id,
        userEmail: req.user.email
      }
    });

    // IMPORTANT: Do not notify user/admin on create.
    // Only notify admins (and optionally the user) after the user submits the required proof fields
    // via POST /api/payments/:id/submit-payment.

    res.status(201).json({
      message: 'Payment created successfully. Please complete the payment.',
      payment: {
        _id: payment._id,
        amount: payment.amount,
        finalAmount: payment.finalAmount,
        currency: payment.currency,
        status: payment.status,
        package: payment.package,
        binanceWallet: payment.binanceWallet,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      message: error.message 
    });
  }
});

// @route   POST /api/payments/monthly-fee
// @desc    Create a new payment for monthly fee (requires package + fee policy)
// @access  Private
router.post('/monthly-fee', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const notificationService = require('../services/notificationService');

    const Payment = require('../models/Payment');
    const completedPackagePayment = await Payment.findOne({
      user: req.user._id,
      status: 'completed',
      type: 'package'
    }).sort({ createdAt: -1 });

    if (!completedPackagePayment) {
      return res.status(403).json({
        error: 'Package required',
        code: 'PACKAGE_REQUIRED',
        redirectTo: '/select-package'
      });
    }

    const pkg = await resolvePackageFromPayment(completedPackagePayment);
    const pkgName = (completedPackagePayment.package?.name || '').trim() || pkg?.name || '';
    if (!pkg || !pkg.monthlyFeeEnabled) {
      return res.status(400).json({
        error: 'Monthly fee not applicable',
        message: 'Your package does not require a monthly fee.'
      });
    }

    const amount = Number(pkg.monthlyFeeAmount ?? 50);
    const graceDays = Number(pkg.monthlyFeeGraceDays ?? 3);

    // Avoid duplicate draft/pending monthly fee payments
    const existingPending = await Payment.findOne({
      user: req.user._id,
      status: { $in: ['draft', 'pending'] },
      type: 'monthly_fee'
    }).sort({ createdAt: -1 });
    if (existingPending) {
      return res.status(200).json({
        message: 'Monthly fee payment already started.',
        payment: existingPending
      });
    }

    const payment = new Payment({
      user: req.user._id,
      amount,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      // IMPORTANT: don't alert admins until user submits proof fields.
      status: 'draft',
      type: 'monthly_fee',
      description: `Monthly fee payment ($${amount})`,
      discountAmount: 0,
      finalAmount: amount,
      metadata: {
        feeType: 'monthly',
        graceDays: String(graceDays),
        packageName: pkgName
      },
      binanceWallet: {
        walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna',
        network: 'TRC20'
      }
    });

    await payment.save();

    res.status(201).json({
      message: 'Monthly fee payment created successfully.',
      payment
    });
  } catch (error) {
    console.error('Create monthly fee payment error:', error);
    res.status(500).json({ error: 'Failed to create monthly fee payment' });
  }
});

// @route   POST /api/payments/:id/submit-payment (must be before GET/PUT /:id)
// @desc    Submit payment with transaction ID, payer details, and screenshot (screenshot stored in env Cloudinary)
// @access  Private
router.post('/:id/submit-payment', authenticateToken, (req, res, next) => {
  paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ errors: [{ msg: err.message || 'Invalid screenshot file' }] });
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    const transactionId = (req.body && req.body.transactionId) ? String(req.body.transactionId).trim() : '';
    const payerName = (req.body && req.body.payerName) ? String(req.body.payerName).trim() : '';
    const payerEmail = (req.body && req.body.payerEmail) ? String(req.body.payerEmail).trim() : '';
    const errors = [];
    if (!transactionId || transactionId.length < 10) errors.push({ msg: 'Transaction ID / hash is required (min 10 characters)', path: 'transactionId' });
    if (!payerName) errors.push({ msg: 'Payer name is required', path: 'payerName' });
    if (!payerEmail) errors.push({ msg: 'Payer email is required', path: 'payerEmail' });
    if (!req.file) errors.push({ msg: 'Payment screenshot image is required', path: 'screenshot' });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const submitOwnerRaw = payment.user && typeof payment.user === 'object' && payment.user._id != null
      ? payment.user._id
      : payment.user;
    const submitOwnerStr = submitOwnerRaw != null ? String(submitOwnerRaw) : '';
    if (submitOwnerStr !== String(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment is already completed' });
    }

    tempFilePath = req.file.path;
    const uploadResult = await uploadImage(tempFilePath, 'forex/payment-screenshots');
    const paymentScreenshotUrl = uploadResult && uploadResult.url ? uploadResult.url : null;
    if (!paymentScreenshotUrl) {
      return res.status(500).json({ error: 'Failed to upload payment screenshot' });
    }

    payment.transactionId = transactionId;
    payment.payerName = payerName;
    payment.payerEmail = payerEmail;
    payment.paymentScreenshotUrl = paymentScreenshotUrl;
    if (payment.status === 'draft') payment.status = 'pending';
    if (payment.paymentMethod === 'binance_wallet') {
      payment.binanceWallet = payment.binanceWallet || {};
      payment.binanceWallet.transactionHash = transactionId;
    }
    await payment.save();

    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount,
          payerName,
          payerEmail,
          paymentScreenshotUrl
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    // Optional: notify the user AFTER submission (so they get confirmation only when proof is actually submitted).
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: payment.package?.name || payment.metadata?.get?.('packageName') || '',
        paymentId: payment._id,
        transactionId: payment.transactionId
      });
    } catch (e) {
      // Don't block submission if notification fails
      console.error('Error sending user payment_pending notification (post-submit):', e);
    }

    res.json({
      success: true,
      message: 'Payment submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        paymentScreenshotUrl: payment.paymentScreenshotUrl
      }
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit payment'
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup temp file:', e); }
    }
  }
});

// @route   POST /api/payments/submit-package
// @desc    Create + submit a package payment in one step (no draft created on package select)
// @access  Private
router.post('/submit-package', authenticateToken, (req, res, next) => {
  paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ errors: [{ msg: err.message || 'Invalid screenshot file' }] });
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    const packageName = (req.body && req.body.packageName) ? String(req.body.packageName).trim() : '';
    const transactionId = (req.body && req.body.transactionId) ? String(req.body.transactionId).trim() : '';
    const payerName = (req.body && req.body.payerName) ? String(req.body.payerName).trim() : '';
    const payerEmail = (req.body && req.body.payerEmail) ? String(req.body.payerEmail).trim() : '';
    const errors = [];
    if (!packageName) errors.push({ msg: 'Package name is required', path: 'packageName' });
    if (!transactionId || transactionId.length < 10) errors.push({ msg: 'Transaction ID / hash is required (min 10 characters)', path: 'transactionId' });
    if (!payerName) errors.push({ msg: 'Payer name is required', path: 'payerName' });
    if (!payerEmail) errors.push({ msg: 'Payer email is required', path: 'payerEmail' });
    if (!req.file) errors.push({ msg: 'Payment screenshot image is required', path: 'screenshot' });
    if (errors.length) return res.status(400).json({ errors });

    const pkg = await Package.findOne({ name: packageName, isActive: true }).lean();
    if (!pkg) return res.status(400).json({ errors: [{ msg: 'Selected package is not available', path: 'packageName' }] });
    const packagePrice = Number(pkg.price ?? 0);
    if (!Number.isFinite(packagePrice) || packagePrice <= 0) {
      return res.status(400).json({ errors: [{ msg: 'Package price is not configured correctly', path: 'packageName' }] });
    }

    // Prevent multiple simultaneous submissions for same package
    const existing = await Payment.findOne({
      user: req.user._id,
      type: 'package',
      'package.name': packageName,
      status: { $in: ['pending', 'processing'] }
    }).sort({ createdAt: -1 });
    if (existing && existing.transactionId && existing.paymentScreenshotUrl) {
      return res.status(200).json({
        success: true,
        message: 'Payment already submitted. Waiting for admin confirmation.',
        payment: {
          _id: existing._id,
          status: existing.status,
          transactionId: existing.transactionId,
          payerName: existing.payerName,
          payerEmail: existing.payerEmail,
          paymentScreenshotUrl: existing.paymentScreenshotUrl
        }
      });
    }

    tempFilePath = req.file.path;
    const uploadResult = await uploadImage(tempFilePath, 'forex/payment-screenshots');
    const paymentScreenshotUrl = uploadResult && uploadResult.url ? uploadResult.url : null;
    if (!paymentScreenshotUrl) return res.status(500).json({ error: 'Failed to upload payment screenshot' });

    const payment = new Payment({
      user: req.user._id,
      amount: packagePrice,
      finalAmount: packagePrice,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      status: 'pending',
      type: 'package',
      package: { name: packageName, price: packagePrice },
      description: `Package purchase: ${packageName}`,
      transactionId,
      payerName,
      payerEmail,
      paymentScreenshotUrl,
      binanceWallet: { walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna', network: 'TRC20', transactionHash: transactionId }
    });
    await payment.save();

    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount,
          payerName,
          payerEmail,
          paymentScreenshotUrl
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    // Optional: notify the user after submission
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName,
        paymentId: payment._id,
        transactionId: payment.transactionId
      });
    } catch (e) {
      console.error('Error sending user payment_pending notification (post-submit):', e);
    }

    return res.json({
      success: true,
      message: 'Payment submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        paymentScreenshotUrl: payment.paymentScreenshotUrl
      }
    });
  } catch (error) {
    console.error('Submit package payment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit payment'
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup temp file:', e); }
    }
  }
});

// @route   POST /api/payments/submit-product
// @desc    Create + submit a product purchase payment in one step
// @access  Private
router.post('/submit-product', authenticateToken, (req, res, next) => {
  paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ errors: [{ msg: err.message || 'Invalid screenshot file' }] });
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    const productId = (req.body && req.body.productId) ? String(req.body.productId).trim().toLowerCase() : '';
    const transactionId = (req.body && req.body.transactionId) ? String(req.body.transactionId).trim() : '';
    const payerName = (req.body && req.body.payerName) ? String(req.body.payerName).trim() : '';
    const payerEmail = (req.body && req.body.payerEmail) ? String(req.body.payerEmail).trim() : '';
    const errors = [];
    if (!productId) errors.push({ msg: 'Product ID is required', path: 'productId' });
    if (!transactionId || transactionId.length < 10) errors.push({ msg: 'Transaction ID / hash is required (min 10 characters)', path: 'transactionId' });
    if (!payerName) errors.push({ msg: 'Payer name is required', path: 'payerName' });
    if (!payerEmail) errors.push({ msg: 'Payer email is required', path: 'payerEmail' });
    if (!req.file) errors.push({ msg: 'Payment screenshot image is required', path: 'screenshot' });
    if (errors.length) return res.status(400).json({ errors });

    const Product = require('../models/Product');
    const product = await Product.findOne({ productId, status: 'published' }).lean();
    if (!product) return res.status(400).json({ errors: [{ msg: 'Product is not available', path: 'productId' }] });
    const productPrice = Number(product.price ?? 0);
    if (!Number.isFinite(productPrice) || productPrice <= 0) {
      return res.status(400).json({ errors: [{ msg: 'Product price is not configured correctly', path: 'productId' }] });
    }

    const existing = await Payment.findOne({
      user: req.user._id,
      type: 'product',
      'product.productId': productId,
      status: { $in: ['pending', 'processing'] }
    }).sort({ createdAt: -1 });
    if (existing && existing.transactionId && existing.paymentScreenshotUrl) {
      return res.status(200).json({
        success: true,
        message: 'Payment already submitted. Waiting for admin confirmation.',
        payment: {
          _id: existing._id,
          status: existing.status,
          transactionId: existing.transactionId,
          payerName: existing.payerName,
          payerEmail: existing.payerEmail,
          paymentScreenshotUrl: existing.paymentScreenshotUrl
        }
      });
    }

    tempFilePath = req.file.path;
    const uploadResult = await uploadImage(tempFilePath, 'forex/payment-screenshots');
    const paymentScreenshotUrl = uploadResult && uploadResult.url ? uploadResult.url : null;
    if (!paymentScreenshotUrl) return res.status(500).json({ error: 'Failed to upload payment screenshot' });

    const payment = new Payment({
      user: req.user._id,
      amount: productPrice,
      finalAmount: productPrice,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      status: 'pending',
      type: 'product',
      product: { productId: product.productId, name: product.name, price: productPrice },
      description: `Product purchase: ${product.name}`,
      transactionId,
      payerName,
      payerEmail,
      paymentScreenshotUrl,
      binanceWallet: { walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna', network: 'TRC20', transactionHash: transactionId }
    });
    await payment.save();

    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount,
          payerName,
          payerEmail,
          paymentScreenshotUrl,
          productName: product.name
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: product.name,
        paymentId: payment._id,
        transactionId: payment.transactionId
      });
    } catch (e) {
      console.error('Error sending user payment_pending notification (post-submit):', e);
    }

    return res.json({
      success: true,
      message: 'Payment submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        paymentScreenshotUrl: payment.paymentScreenshotUrl
      }
    });
  } catch (error) {
    console.error('Submit product payment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit payment'
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup temp file:', e); }
    }
  }
});

// @route   POST /api/payments/submit-product-cart
// @desc    Create + submit a multi-item product cart payment in one step
// @access  Private
router.post('/submit-product-cart', authenticateToken, (req, res, next) => {
  paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ errors: [{ msg: err.message || 'Invalid screenshot file' }] });
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    let items = [];
    try {
      const raw = req.body && req.body.items ? String(req.body.items) : '[]';
      items = JSON.parse(raw);
    } catch {
      return res.status(400).json({ errors: [{ msg: 'Invalid cart items', path: 'items' }] });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errors: [{ msg: 'Cart is empty', path: 'items' }] });
    }

    const transactionId = (req.body && req.body.transactionId) ? String(req.body.transactionId).trim() : '';
    const payerName = (req.body && req.body.payerName) ? String(req.body.payerName).trim() : '';
    const payerEmail = (req.body && req.body.payerEmail) ? String(req.body.payerEmail).trim() : '';
    const errors = [];
    if (!transactionId || transactionId.length < 10) errors.push({ msg: 'Transaction ID / hash is required (min 10 characters)', path: 'transactionId' });
    if (!payerName) errors.push({ msg: 'Payer name is required', path: 'payerName' });
    if (!payerEmail) errors.push({ msg: 'Payer email is required', path: 'payerEmail' });
    if (!req.file) errors.push({ msg: 'Payment screenshot image is required', path: 'screenshot' });
    if (errors.length) return res.status(400).json({ errors });

    const Product = require('../models/Product');
    const productItems = [];
    let total = 0;

    for (const row of items) {
      const productId = row && row.productId ? String(row.productId).trim().toLowerCase() : '';
      const quantity = Math.max(1, Math.floor(Number(row?.quantity) || 1));
      if (!productId) {
        return res.status(400).json({ errors: [{ msg: 'Each cart item needs a product ID', path: 'items' }] });
      }
      const product = await Product.findOne({ productId, status: 'published' }).lean();
      if (!product) {
        return res.status(400).json({ errors: [{ msg: `Product is not available: ${productId}`, path: 'items' }] });
      }
      const productPrice = Number(product.price ?? 0);
      if (!Number.isFinite(productPrice) || productPrice <= 0) {
        return res.status(400).json({ errors: [{ msg: `Product price is not configured: ${productId}`, path: 'items' }] });
      }
      productItems.push({
        productId: product.productId,
        name: product.name,
        price: productPrice,
        quantity
      });
      total += productPrice * quantity;
    }

    const existing = await Payment.findOne({
      user: req.user._id,
      type: 'product',
      status: { $in: ['pending', 'processing'] },
      'productItems.0': { $exists: true }
    }).sort({ createdAt: -1 });
    if (existing && existing.transactionId && existing.paymentScreenshotUrl) {
      return res.status(200).json({
        success: true,
        message: 'Payment already submitted. Waiting for admin confirmation.',
        payment: {
          _id: existing._id,
          status: existing.status,
          transactionId: existing.transactionId,
          payerName: existing.payerName,
          payerEmail: existing.payerEmail,
          paymentScreenshotUrl: existing.paymentScreenshotUrl
        }
      });
    }

    tempFilePath = req.file.path;
    const uploadResult = await uploadImage(tempFilePath, 'forex/payment-screenshots');
    const paymentScreenshotUrl = uploadResult && uploadResult.url ? uploadResult.url : null;
    if (!paymentScreenshotUrl) return res.status(500).json({ error: 'Failed to upload payment screenshot' });

    const itemNames = productItems.map((i) => i.name).join(', ');
    const first = productItems[0];
    const payment = new Payment({
      user: req.user._id,
      amount: total,
      finalAmount: total,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      status: 'pending',
      type: 'product',
      product: { productId: first.productId, name: first.name, price: first.price },
      productItems,
      description: `Cart purchase: ${itemNames}`,
      transactionId,
      payerName,
      payerEmail,
      paymentScreenshotUrl,
      binanceWallet: { walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna', network: 'TRC20', transactionHash: transactionId }
    });
    await payment.save();

    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount,
          payerName,
          payerEmail,
          paymentScreenshotUrl,
          productName: itemNames
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: itemNames,
        paymentId: payment._id,
        transactionId: payment.transactionId
      });
    } catch (e) {
      console.error('Error sending user payment_pending notification (post-submit):', e);
    }

    return res.json({
      success: true,
      message: 'Payment submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        paymentScreenshotUrl: payment.paymentScreenshotUrl
      }
    });
  } catch (error) {
    console.error('Submit product cart payment error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit payment'
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup temp file:', e); }
    }
  }
});

// @route   POST /api/payments/submit-package-upgrade
// @desc    Student: submit upgrade payment (pay full price of selected/next package tier)
// @access  Private
router.post('/submit-package-upgrade', authenticateToken, (req, res, next) => {
  paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ errors: [{ msg: err.message || 'Invalid screenshot file' }] });
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    const targetPackageName = (req.body && req.body.targetPackageName) ? String(req.body.targetPackageName).trim() : '';
    const transactionId = (req.body && req.body.transactionId) ? String(req.body.transactionId).trim() : '';
    const payerName = (req.body && req.body.payerName) ? String(req.body.payerName).trim() : '';
    const payerEmail = (req.body && req.body.payerEmail) ? String(req.body.payerEmail).trim() : '';
    const errors = [];
    if (!transactionId || transactionId.length < 10) errors.push({ msg: 'Transaction ID / hash is required (min 10 characters)', path: 'transactionId' });
    if (!payerName) errors.push({ msg: 'Payer name is required', path: 'payerName' });
    if (!payerEmail) errors.push({ msg: 'Payer email is required', path: 'payerEmail' });
    if (!req.file) errors.push({ msg: 'Payment screenshot image is required', path: 'screenshot' });
    if (errors.length) return res.status(400).json({ errors });

    await Package.ensureDefaults();

    const currentPayment = await Payment.findOne({
      user: req.user._id,
      status: 'completed',
      type: 'package'
    }).sort({ createdAt: -1 }).lean();

    if (!currentPayment?.package?.name) {
      return res.status(400).json({ errors: [{ msg: 'No active package found to upgrade from', path: 'package' }] });
    }

    const currentPkg =
      (await Package.findOne({ name: currentPayment.package.name, isActive: true }).lean()) ||
      (await Package.findOne({ price: Number(currentPayment.package.price || 0), isActive: true }).lean());
    if (!currentPkg) {
      return res.status(400).json({ errors: [{ msg: 'Current package is not available for upgrade', path: 'package' }] });
    }

    const baseQuery = {
      isActive: true,
      sortOrder: { $gt: Number(currentPkg.sortOrder || 0) }
    };

    const nextPkg = targetPackageName
      ? await Package.findOne({ ...baseQuery, name: targetPackageName }).lean()
      : await Package.findOne(baseQuery).sort({ sortOrder: 1, createdAt: 1 }).lean();

    if (!nextPkg) {
      return res.status(400).json({
        errors: [
          {
            msg: targetPackageName
              ? 'Selected package is not available for upgrade'
              : 'No upgrade available (already on top tier)',
            path: 'package'
          }
        ]
      });
    }

    const upgradePrice = Number(nextPkg.price || 0);
    if (!Number.isFinite(upgradePrice) || upgradePrice <= 0) {
      return res.status(400).json({ errors: [{ msg: 'Selected package price is not configured correctly', path: 'package' }] });
    }

    // Prevent multiple simultaneous submissions for same upgrade target
    const existing = await Payment.findOne({
      user: req.user._id,
      type: 'package',
      status: { $in: ['pending', 'processing'] },
      'package.name': nextPkg.name
    }).sort({ createdAt: -1 }).lean();

    if (existing && existing.transactionId && existing.paymentScreenshotUrl) {
      return res.status(200).json({
        success: true,
        message: 'Upgrade payment already submitted. Waiting for admin confirmation.',
        payment: {
          _id: existing._id,
          status: existing.status,
          transactionId: existing.transactionId,
          payerName: existing.payerName,
          payerEmail: existing.payerEmail,
          paymentScreenshotUrl: existing.paymentScreenshotUrl
        }
      });
    }

    tempFilePath = req.file.path;
    const uploadResult = await uploadImage(tempFilePath, 'forex/payment-screenshots');
    const paymentScreenshotUrl = uploadResult && uploadResult.url ? uploadResult.url : null;
    if (!paymentScreenshotUrl) return res.status(500).json({ error: 'Failed to upload payment screenshot' });

    const payment = new Payment({
      user: req.user._id,
      amount: upgradePrice,
      finalAmount: upgradePrice,
      currency: 'USD',
      paymentMethod: 'binance_wallet',
      status: 'pending',
      type: 'package',
      // IMPORTANT: embed target package so perks apply once this payment is completed.
      package: { name: nextPkg.name, price: Number(nextPkg.price || 0) },
      description: `Package upgrade: ${currentPkg.name} → ${nextPkg.name}`,
      transactionId,
      payerName,
      payerEmail,
      paymentScreenshotUrl,
      binanceWallet: { walletAddress: 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna', network: 'TRC20', transactionHash: transactionId },
      metadata: new Map([
        ['isPackageUpgrade', '1'],
        ['upgradeFromPackageName', String(currentPkg.name)],
        ['upgradeFromPackagePrice', String(Number(currentPkg.price || 0))],
        ['upgradeToPackageName', String(nextPkg.name)],
        ['upgradeToPackagePrice', String(Number(nextPkg.price || 0))],
        // Payment amount charged for the upgrade request
        ['upgradePrice', String(upgradePrice)]
      ])
    });
    await payment.save();

    // Notify admins
    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount,
          payerName,
          payerEmail,
          paymentScreenshotUrl
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    // Notify user after submission
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: nextPkg.name,
        paymentId: payment._id,
        transactionId: payment.transactionId
      });
    } catch (e) {
      console.error('Error sending user payment_pending notification (upgrade post-submit):', e);
    }

    return res.json({
      success: true,
      message: 'Upgrade payment submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        paymentScreenshotUrl: payment.paymentScreenshotUrl,
        upgrade: {
          from: { name: currentPkg.name, price: Number(currentPkg.price || 0) },
          to: { name: nextPkg.name, price: Number(nextPkg.price || 0) },
          upgradePrice
        }
      }
    });
  } catch (error) {
    console.error('Submit package upgrade error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit package upgrade'
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Cleanup temp file:', e); }
    }
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const ownerIdRaw = payment.user && typeof payment.user === 'object' && payment.user._id != null
      ? payment.user._id
      : payment.user;
    const ownerStr = ownerIdRaw != null ? String(ownerIdRaw) : '';

    if (ownerStr !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// @route   PUT /api/payments/:id
// @desc    Update payment (e.g., add promo code)
// @access  Private
router.put('/:id', [
  authenticateToken,
  body('promoCode').optional().trim(),
  body('discount').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { promoCode, discount } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns the payment or is admin
    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow updates if payment is pending
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot update payment that is not pending' });
    }

    // Update promo code and discount if provided
    if (promoCode !== undefined) {
      payment.promoCode = promoCode || null;
    }
    if (discount !== undefined) {
      payment.discount = discount || 0;
      // Recalculate final amount
      payment.finalAmount = payment.amount - (discount || 0);
    }

    await payment.save();

    res.json({ 
      message: 'Payment updated successfully',
      payment 
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// @route   PUT /api/payments/:id/transaction
// @desc    Update payment with transaction ID (for Binance wallet payments)
// @access  Private
router.put('/:id/transaction', [
  authenticateToken,
  body('transactionId')
    .trim()
    .notEmpty().withMessage('Transaction ID is required')
    .isLength({ min: 10 }).withMessage('Transaction ID / hash must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns the payment
    if (payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if payment is already completed
    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment is already completed' });
    }

    // Update transaction ID and store in binanceWallet as well
    payment.transactionId = transactionId;
    if (payment.paymentMethod === 'binance_wallet') {
      payment.binanceWallet = payment.binanceWallet || {};
      payment.binanceWallet.transactionHash = transactionId;
    }
    
    await payment.save();

    // Notify admins about the new transaction ID
    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'transaction_submitted',
          paymentId: payment._id,
          transactionId: transactionId,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          amount: payment.finalAmount
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Transaction ID submitted successfully. Waiting for admin confirmation.',
      payment: {
        _id: payment._id,
        status: payment.status,
        transactionId: payment.transactionId
      }
    });

  } catch (error) {
    console.error('Update transaction ID error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to update transaction ID' 
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Refund payment (admin only)
// @access  Private/Admin
router.post('/refund', [
  authenticateToken,
  requireAdmin,
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('amount').isNumeric().withMessage('Amount is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('rollbackCommissions').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, amount, reason, rollbackCommissions } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!payment.isRefundable) {
      return res.status(400).json({ error: 'Payment is not refundable' });
    }

    const success = payment.refundPayment(amount, reason, req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'Refund failed' });
    }

    await payment.save();

    // Optional: rollback referral commissions that were paid out due to this payment.
    // IMPORTANT: Use negative `referral_commission` rows so admin commission reports net out correctly.
    let rollback = { reversedCount: 0 };
    if (rollbackCommissions === true && payment.type === 'package') {
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
            description: 'Commission rollback (payment refunded by admin)',
            relatedPayment: payment._id,
            notes: `Reversing referral commission of $${Number(tx.amount || 0).toFixed(2)} due to refund`,
            performedBy: req.user._id,
            metadata: new Map([
              ['rollbackOfTransactionId', String(tx._id)],
              ['rollbackSource', 'admin_refund_payment']
            ])
          });

          // Best-effort: keep referralStats.totalEarnings aligned
          try {
            const User = require('../models/User');
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

        rollback = { reversedCount };
      } catch (e) {
        // best-effort
      }
    }

    res.json({
      message: 'Refund processed successfully',
      payment,
      rollback
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// @route   POST /api/payments/process
// @desc    Process payment with selected method
// @access  Private
router.post('/process', [
  authenticateToken,
  body('amount').isNumeric().withMessage('Amount is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('description').optional().trim(),
  body('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  body('promoCode').optional().trim(),
  body('customerEmail').optional().isEmail().withMessage('Invalid email'),
  body('customerPhone').optional().trim(),
  body('customerName').optional().trim(),
  body('type').optional().isIn(['signup', 'course', 'session', 'subscription', 'signal', 'package']),
  body('package').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const paymentData = {
      userId: req.user._id,
      ...req.body
    };

    const result = await paymentProcessor.processPayment(paymentData);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to process payment' 
    });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment completion
// @access  Private
router.post('/confirm', [
  authenticateToken,
  body('paymentId').isMongoId().withMessage('Payment ID is required'),
  body('confirmationData').isObject().withMessage('Confirmation data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, confirmationData } = req.body;

    const result = await paymentProcessor.confirmPayment(paymentId, confirmationData);

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: result
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to confirm payment' 
    });
  }
});

// @route   POST /api/payments/jazzcash/callback
// @desc    JazzCash payment callback
// @access  Public
router.post('/jazzcash/callback', async (req, res) => {
  try {
    const JazzCashService = require('../services/jazzcashService');
    const jazzcash = new JazzCashService();

    const result = await jazzcash.verifyPaymentResponse(req.body);

    if (result.success) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?transactionId=${result.transactionId}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${encodeURIComponent(result.responseMessage)}`);
    }

  } catch (error) {
    console.error('JazzCash callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${encodeURIComponent('Payment verification failed')}`);
  }
});

// @route   POST /api/payments/easypaisa/callback
// @desc    EasyPaisa payment callback
// @access  Public
router.post('/easypaisa/callback', async (req, res) => {
  try {
    const EasyPaisaService = require('../services/easypaisaService');
    const easypaisa = new EasyPaisaService();

    const result = await easypaisa.verifyPaymentResponse(req.body);

    if (result.success) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?transactionId=${result.transactionId}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${encodeURIComponent(result.status)}`);
    }

  } catch (error) {
    console.error('EasyPaisa callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${encodeURIComponent('Payment verification failed')}`);
  }
});

// @route   POST /api/payments/jazzcash/webhook
// @desc    JazzCash webhook handler
// @access  Public
router.post('/jazzcash/webhook', async (req, res) => {
  try {
    const JazzCashService = require('../services/jazzcashService');
    const jazzcash = new JazzCashService();

    await jazzcash.verifyPaymentResponse(req.body);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('JazzCash webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// @route   POST /api/payments/easypaisa/webhook
// @desc    EasyPaisa webhook handler
// @access  Public
router.post('/easypaisa/webhook', async (req, res) => {
  try {
    const EasyPaisaService = require('../services/easypaisaService');
    const easypaisa = new EasyPaisaService();

    await easypaisa.verifyPaymentResponse(req.body);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('EasyPaisa webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// @route   POST /api/payments/admin/confirm
// @desc    Admin confirms Binance wallet payment (admin only)
// @access  Private/Admin
router.post('/admin/confirm', [
  authenticateToken,
  requireAdmin,
  body('paymentId').isMongoId().withMessage('Payment ID is required'),
  body('transactionHash').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, transactionHash, notes } = req.body;
    const User = require('../models/User');

    const payment = await Payment.findById(paymentId).populate('user');
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ error: 'Payment already confirmed' });
    }

    // If this is a package upgrade, ensure the embedded package reflects the UPGRADED tier
    // BEFORE we save as completed (so downstream perks/badges use the right package).
    try {
      const isUpgrade = !!(payment.metadata && payment.metadata.get && payment.metadata.get('isPackageUpgrade') === '1');
      if (payment.type === 'package' && isUpgrade) {
        const upgradeToName = payment.metadata.get('upgradeToPackageName');
        if (upgradeToName && (!payment.package || payment.package.name !== upgradeToName)) {
          const nextPkg = await Package.findOne({ name: upgradeToName, isActive: true }).lean();
          if (nextPkg) {
            payment.package = { name: nextPkg.name, price: Number(nextPkg.price || 0) };
          } else {
            // Fallback to metadata price/name
            const metaPrice = Number(payment.metadata.get('upgradeToPackagePrice') || 0);
            payment.package = { name: upgradeToName, price: Number.isFinite(metaPrice) ? metaPrice : 0 };
          }
        }
      }
    } catch (e) {
      // best-effort; don't block confirmation
    }

    // Update payment status
    payment.status = 'completed';
    payment.adminConfirmed = true;
    payment.confirmedBy = req.user._id;
    payment.confirmedAt = new Date();
    if (transactionHash) {
      payment.binanceWallet = payment.binanceWallet || {};
      payment.binanceWallet.transactionHash = transactionHash;
    }
    await payment.save();

    // Load user (and only verify on initial package purchase)
    const user = await User.findById(payment.user._id);
    if (user && payment.type === 'package') {
      user.isVerified = true;
      await user.save();
    }

    await logActivity({
      req,
      actor: { userId: req.user._id, email: req.user.email, role: req.user.role },
      action: 'payment.confirmed',
      entity: { type: 'payment', id: payment._id, label: `payment:${payment._id}` },
      metadata: {
        type: payment.type,
        packageName: payment.package?.name,
        amount: payment.amount,
        finalAmount: payment.finalAmount,
        userId: (payment.user && payment.user._id ? payment.user._id.toString() : (payment.user?._id || payment.user)) || undefined,
        userEmail: user?.email || payment.user?.email,
        confirmedUserId: payment.user?._id || payment.user
      }
    });

    // Automatically enroll user in published courses allowed for their package
    if (payment.type === 'package' && user) {
      try {
        const Course = require('../models/Course');
        const { canAccessCourseByPackage } = require('../utils/coursePackageAccess');
        const packagePrice =
          payment.package?.price != null ? Number(payment.package.price) : null;

        // Find all published courses
        const publishedCourses = await Course.find({
          $or: [
            { isPublished: true },
            { status: 'published' }
          ]
        });

        const eligibleCourses = publishedCourses.filter((course) =>
          canAccessCourseByPackage(course, packagePrice, { isPrivileged: false })
        );

        console.log(
          `[Payment Confirm] Auto-enrolling user ${user.email} (pkg $${packagePrice}) in ${eligibleCourses.length}/${publishedCourses.length} published courses`
        );

        // Enroll user only in package-eligible courses
        for (const course of eligibleCourses) {
          try {
            // Check if user is already enrolled
            const isEnrolled = course.enrolledStudents.some(
              enrollment => enrollment.student.toString() === user._id.toString()
            );

            if (!isEnrolled) {
              // Enroll user in course
              course.enrollStudent(user._id);
              await course.save({ validateBeforeSave: false });

              // Also update user's enrolled courses array
              const isUserEnrolled = user.enrolledCourses.some(
                enrollment => enrollment.courseId.toString() === course._id.toString()
              );

              if (!isUserEnrolled) {
                user.enrolledCourses.push({
                  courseId: course._id,
                  enrolledAt: new Date(),
                  progress: 0,
                  completedLessons: 0,
                  totalLessons: course.content ? course.content.length : (course.videos ? course.videos.length : 0),
                  lastAccessed: new Date()
                });
              }
            }
          } catch (enrollError) {
            console.error(`[Payment Confirm] Error enrolling user in course ${course.title}:`, enrollError);
            // Continue with other courses even if one fails
          }
        }

        // Save user with updated enrolled courses
        await user.save();
        console.log(`[Payment Confirm] Successfully enrolled user ${user.email} in courses`);
      } catch (enrollError) {
        console.error('[Payment Confirm] Error during auto-enrollment:', enrollError);
        // Don't fail payment confirmation if enrollment fails
      }
    }

    // Distribute referral commissions if it's a package purchase
    let commissionsDistributed = [];
    if (payment.type === 'package') {
      try {
        const ReferralCommissionService = require('../services/referralCommissionService');
        const commissionService = new ReferralCommissionService();
        commissionsDistributed = await commissionService.distributeCommissions(payment);
        console.log(`[Payment Confirm] Distributed ${commissionsDistributed.length} commissions`);
      } catch (commissionError) {
        console.error('[Payment Confirm] Error distributing commissions:', commissionError);
        // Don't fail the payment confirmation if commission distribution fails
      }
    }

    // Auto-distribute monthly fee referral pool when admin confirms the fee
    if (payment.type === 'monthly_fee') {
      try {
        const ReferralCommissionService = require('../services/referralCommissionService');
        const commissionService = new ReferralCommissionService();
        commissionsDistributed = await commissionService.distributeMonthlyFeeCommissions(payment);
        console.log(
          `[Payment Confirm] Monthly fee distribution: ${commissionsDistributed.length} commission(s)`
        );
      } catch (commissionError) {
        console.error('[Payment Confirm] Error distributing monthly fee commissions:', commissionError);
        // Don't fail confirmation — admin can retry from Monthly fee distribution
      }
    }

    // Rank rewards: based on direct referral package business volume (best-effort).
    // When a user completes a package purchase, attribute its amount to their DIRECT referrer only.
    if (payment.type === 'package' && user) {
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
        // ignore
      }
    }

    // Send notification and email to user
    const notificationService = require('../services/notificationService');
    try {
      let emailAttachments;
      try {
        const receiptBuffer = await receiptService.generatePaymentReceiptPdf(payment, user);
        const receiptName = receiptService.receiptFilename(receiptService.receiptNumberForPayment(payment));
        emailAttachments = [{
          filename: receiptName,
          content: receiptBuffer,
          contentType: 'application/pdf'
        }];
      } catch (receiptError) {
        console.error('[Payment Confirm] Failed to attach receipt PDF:', receiptError);
      }

      // Send payment confirmed email using notificationService (which uses templates)
      await notificationService.sendNotificationToUser(user._id, 'payment_confirmed', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: payment.type === 'monthly_fee' ? 'Monthly Fee' : (payment.package?.name || 'Premium Package'),
        transactionId: payment.transactionId || payment._id.toString(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        paymentId: payment._id,
        receiptUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/receipts`,
        emailAttachments
      });

      // Also send account verified email
      if (payment.type === 'package') {
        await notificationService.sendNotificationToUser(user._id, 'account_verified', {
          packageName: payment.package?.name || 'Premium Package'
        });
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation notification:', emailError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment,
      commissionsDistributed: commissionsDistributed.length,
      commissionDetails: commissionsDistributed
    });

  } catch (error) {
    console.error('Admin confirm payment error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to confirm payment' 
    });
  }
});

module.exports = router;
