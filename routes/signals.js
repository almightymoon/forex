const express = require('express');
const { body, validationResult } = require('express-validator');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken, requireTeacher, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/signals
// @desc    Get all trading signals
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Fetch real signals from database and populate teacher information
    const signals = await TradingSignal.find({ isPublished: true })
      .populate('teacher', 'firstName lastName profileImage email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // If no real signals exist yet, return empty array instead of sample data
    res.json(signals);
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
      .populate('teacher', 'firstName lastName profileImage email');
    
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
  requireTeacher,
  body('symbol').trim().notEmpty().withMessage('Symbol is required'),
  body('type').isIn(['buy', 'sell', 'hold', 'strong_buy', 'strong_sell']).withMessage('Invalid signal type'),
  body('entryPrice').isNumeric().withMessage('Entry price is required'),
  body('targetPrice').isNumeric().withMessage('Target price is required'),
  body('stopLoss').isNumeric().withMessage('Stop loss is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('timeframe').isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']).withMessage('Invalid timeframe'),
  body('confidence').isInt({ min: 1, max: 100 }).withMessage('Confidence must be between 1-100'),
  body('instrumentType').isIn(['forex', 'crypto', 'stocks', 'commodities', 'indices', 'futures']).withMessage('Invalid instrument type'),
  body('currentBid').isNumeric().withMessage('Current bid price is required'),
  body('currentAsk').isNumeric().withMessage('Current ask price is required'),
  body('dailyHigh').isNumeric().withMessage('Daily high is required'),
  body('dailyLow').isNumeric().withMessage('Daily low is required'),
  body('priceChange').isNumeric().withMessage('Price change is required'),
  body('priceChangePercent').isNumeric().withMessage('Price change percentage is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const signalData = {
      ...req.body,
      teacher: req.user._id
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
    ).populate('teacher', 'firstName lastName profileImage');

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

// @route   POST /api/signals/:id/close
// @desc    Close signal
// @access  Private/Instructor (owner)
router.post('/:id/close', authenticateToken, requireOwnership('TradingSignal'), async (req, res) => {
  try {
    const signal = await TradingSignal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    signal.status = 'closed';
    await signal.save();

    res.json({ 
      message: 'Signal closed successfully',
      signal
    });

  } catch (error) {
    console.error('Close signal error:', error);
    res.status(500).json({ error: 'Failed to close signal' });
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
