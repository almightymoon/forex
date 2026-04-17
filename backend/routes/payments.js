const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const PaymentProcessor = require('../services/paymentProcessor');
const Package = require('../models/Package');
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

    // Check if user already has a pending payment for this package
    const existingPayment = await Payment.findOne({
      user: req.user._id,
      status: 'pending',
      'package.name': packageName
    });

    if (existingPayment) {
      return res.status(400).json({ 
        error: 'You already have a pending payment for this package',
        payment: existingPayment
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
      status: 'pending',
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

    // Send notification to admins
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await notificationService.sendNotificationToUser(admin._id, 'admin', {
          type: 'payment_pending',
          paymentId: payment._id,
          userId: req.user._id,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          packageName: packageName,
          amount: finalAmount
        });
      }
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    // Send beautiful email to user about payment pending using notification service
    try {
      console.log('[Payment Create] Sending payment_pending notification to user:', req.user._id);
      console.log('[Payment Create] Payment data:', {
        amount: finalAmount,
        currency: payment.currency || 'USD',
        packageName: packageName,
        paymentId: payment._id
      });
      
      const result = await notificationService.sendNotificationToUser(req.user._id, 'payment_pending', {
        amount: finalAmount,
        finalAmount: finalAmount,
        currency: payment.currency || 'USD',
        packageName: packageName,
        paymentId: payment._id,
        transactionId: payment._id.toString()
      });
      
      console.log('[Payment Create] Notification result:', result);
    } catch (emailError) {
      console.error('[Payment Create] ❌ Error sending payment pending notification:', emailError);
      console.error('[Payment Create] Error stack:', emailError.stack);
      // Don't fail the request if notification fails
    }

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
    if (payment.user.toString() !== req.user._id.toString()) {
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

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Check if user owns the payment or is admin
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
  body('reason').trim().notEmpty().withMessage('Reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, amount, reason } = req.body;

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

    res.json({
      message: 'Refund processed successfully',
      payment
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

// @route   GET /api/payments/methods
// @desc    Get available payment methods
// @access  Public
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
      methods: methods.filter(method => method.enabled)
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// @route   GET /api/payments/stats/summary
// @desc    Get payment statistics (admin only)
// @access  Private/Admin
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Payment.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
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

    // Update user verification
    const user = await User.findById(payment.user._id);
    if (user) {
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

    // Automatically enroll user in all published courses when payment is confirmed
    if (payment.type === 'package' && user) {
      try {
        const Course = require('../models/Course');
        
        // Find all published courses
        const publishedCourses = await Course.find({
          $or: [
            { isPublished: true },
            { status: 'published' }
          ]
        });

        console.log(`[Payment Confirm] Auto-enrolling user ${user.email} in ${publishedCourses.length} published courses`);

        // Enroll user in each published course
        for (const course of publishedCourses) {
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

    // Send notification and email to user
    const notificationService = require('../services/notificationService');
    try {
      // Send payment confirmed email using notificationService (which uses templates)
      await notificationService.sendNotificationToUser(user._id, 'payment_confirmed', {
        amount: payment.finalAmount,
        finalAmount: payment.finalAmount,
        currency: payment.currency || 'USD',
        packageName: payment.package?.name || 'Premium Package',
        transactionId: payment.transactionId || payment._id.toString(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        paymentId: payment._id
      });

      // Also send account verified email
      await notificationService.sendNotificationToUser(user._id, 'account_verified', {
        packageName: payment.package?.name || 'Premium Package'
      });
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
