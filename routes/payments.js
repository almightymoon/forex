const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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
