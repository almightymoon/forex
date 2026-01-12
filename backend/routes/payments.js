const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const PaymentProcessor = require('../services/paymentProcessor');

const router = express.Router();
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
    
    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
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
  body('customerName').optional().trim()
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

module.exports = router;
