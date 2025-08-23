const express = require('express');
const { body, validationResult } = require('express-validator');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken, requireInstructor, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/signals
// @desc    Get all trading signals
// @access  Public
router.get('/', async (req, res) => {
  try {
    // For now, return sample data since we don't have actual signals yet
    const sampleSignals = [
      {
        _id: '1',
        symbol: 'EUR/USD',
        type: 'buy',
        entryPrice: 1.0850,
        targetPrice: 1.0920,
        stopLoss: 1.0800,
        description: 'Strong support at 1.0850 with bullish divergence on RSI. Expecting a bounce towards resistance at 1.0920.',
        timeframe: '4h',
        confidence: 85,
        instructor: { firstName: 'John', lastName: 'Doe' },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        comments: 12
      },
      {
        _id: '2',
        symbol: 'GBP/JPY',
        type: 'sell',
        entryPrice: 185.50,
        targetPrice: 184.00,
        stopLoss: 186.50,
        description: 'Price rejected at key resistance level. Bearish engulfing pattern suggests a reversal. Target support at 184.00.',
        timeframe: '1h',
        confidence: 78,
        instructor: { firstName: 'Jane', lastName: 'Smith' },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        comments: 8
      },
      {
        _id: '3',
        symbol: 'USD/CAD',
        type: 'hold',
        entryPrice: 1.3650,
        targetPrice: 1.3700,
        stopLoss: 1.3600,
        description: 'Market in consolidation phase. Wait for breakout above 1.3700 or breakdown below 1.3600 before taking action.',
        timeframe: '1d',
        confidence: 65,
        instructor: { firstName: 'Mike', lastName: 'Johnson' },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        comments: 5
      }
    ];
    
    res.json(sampleSignals);
  } catch (error) {
    console.error('Get signals error:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// @route   GET /api/signals/:id
// @desc    Get signal by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id)
      .populate('instructor', 'firstName lastName profileImage email');
    
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    
    res.json(signal);
  } catch (error) {
    console.error('Get signal error:', error);
    res.status(500).json({ error: 'Failed to fetch signal' });
  }
});

// @route   POST /api/signals
// @desc    Create new trading signal
// @access  Private/Instructor
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('symbol').trim().notEmpty().withMessage('Symbol is required'),
  body('type').isIn(['buy', 'sell', 'hold', 'strong_buy', 'strong_sell']).withMessage('Invalid signal type'),
  body('entryPrice').isNumeric().withMessage('Entry price is required'),
  body('targetPrice').isNumeric().withMessage('Target price is required'),
  body('stopLoss').isNumeric().withMessage('Stop loss is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('timeframe').isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']).withMessage('Invalid timeframe'),
  body('confidence').isInt({ min: 1, max: 100 }).withMessage('Confidence must be between 1-100'),
  body('market').isIn(['forex', 'crypto', 'stocks', 'commodities', 'indices', 'futures']).withMessage('Invalid market')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const signalData = {
      ...req.body,
      instructor: req.user._id
    };

    const signal = new TradingSignal(signalData);
    await signal.save();

    res.status(201).json({
      message: 'Signal created successfully',
      signal
    });

  } catch (error) {
    console.error('Create signal error:', error);
    res.status(500).json({ error: 'Failed to create signal' });
  }
});

// @route   PUT /api/signals/:id
// @desc    Update signal
// @access  Private/Instructor (owner)
router.put('/:id', [
  authenticateToken,
  requireOwnership('TradingSignal'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('confidence').optional().isInt({ min: 1, max: 100 }).withMessage('Confidence must be between 1-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const signal = await TradingSignal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName profileImage');

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    res.json({
      message: 'Signal updated successfully',
      signal
    });

  } catch (error) {
    console.error('Update signal error:', error);
    res.status(500).json({ error: 'Failed to update signal' });
  }
});

// @route   DELETE /api/signals/:id
// @desc    Delete signal
// @access  Private/Instructor (owner)
router.delete('/:id', authenticateToken, requireOwnership('TradingSignal'), async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    await TradingSignal.findByIdAndDelete(req.params.id);

    res.json({ message: 'Signal deleted successfully' });

  } catch (error) {
    console.error('Delete signal error:', error);
    res.status(500).json({ error: 'Failed to delete signal' });
  }
});

// @route   POST /api/signals/:id/subscribe
// @desc    Subscribe to signal
// @access  Private
router.post('/:id/subscribe', authenticateToken, async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    if (!signal.isPublic && !signal.subscribers.some(s => s.student.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Signal is not public' });
    }

    const success = signal.subscribeStudent(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    await signal.save();

    res.json({
      message: 'Subscribed successfully',
      signal
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// @route   POST /api/signals/:id/unsubscribe
// @desc    Unsubscribe from signal
// @access  Private
router.post('/:id/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    const success = signal.unsubscribeStudent(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'Not subscribed' });
    }

    await signal.save();

    res.json({
      message: 'Unsubscribed successfully',
      signal
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

module.exports = router;
