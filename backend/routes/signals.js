const express = require('express');
const { body, validationResult } = require('express-validator');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken, requireTeacher, requireOwnership, requireVerifiedPayment } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

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
  body('symbol').optional().trim(),
  body('type').optional().isIn(['buy', 'sell', 'hold', 'strong_buy', 'strong_sell']).withMessage('Invalid signal type'),
  body('entryPrice').isFloat({ min: 0 }).withMessage('Entry price must be a positive number'),
  body('targetPrice').optional().isFloat({ min: 0 }).withMessage('Target price must be a positive number'),
  body('targets').optional().isArray({ min: 1 }).withMessage('Targets must be a non-empty array'),
  body('targets.*').optional().isFloat({ min: 0 }).withMessage('Each target must be a positive number'),
  body('stopLoss').isFloat({ min: 0 }).withMessage('Stop loss must be a positive number'),
  body('description').optional().trim(),
  body('timeframe').optional().isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']).withMessage('Invalid timeframe'),
  body('confidence').optional().isInt({ min: 1, max: 100 }).withMessage('Confidence must be between 1-100'),
  body('instrumentType').optional().isIn(['forex', 'crypto', 'stocks', 'commodities', 'indices', 'futures']).withMessage('Invalid instrument type'),
  body('currentBid').optional().isFloat({ min: 0 }).withMessage('Current bid price must be a positive number'),
  body('currentAsk').optional().isFloat({ min: 0 }).withMessage('Current ask price must be a positive number'),
  body('dailyHigh').optional().isFloat({ min: 0 }).withMessage('Daily high must be a positive number'),
  body('dailyLow').optional().isFloat({ min: 0 }).withMessage('Daily low must be a positive number'),
  body('priceChange').optional().isFloat().withMessage('Price change must be a number'),
  body('priceChangePercent').optional().isFloat().withMessage('Price change percentage must be a number'),
  body('positionSize').optional().isFloat({ min: 0 }).withMessage('Position size must be a positive number'),
  body('maxRisk').optional().isFloat({ min: 0 }).withMessage('Maximum risk must be a positive number'),
  body('riskRewardRatio').optional().isFloat({ min: 0 }).withMessage('Risk-reward ratio must be a positive number'),
  body('expectedReturn').optional().isFloat({ min: 0 }).withMessage('Expected return must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    // Additional business logic validation
    const validationErrors = [];
    const hasPositive = (v) => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) > 0;
    const bid = hasPositive(req.body.currentBid) ? Number(req.body.currentBid) : null;
    const ask = hasPositive(req.body.currentAsk) ? Number(req.body.currentAsk) : null;
    const dailyLow = hasPositive(req.body.dailyLow) ? Number(req.body.dailyLow) : null;
    const dailyHigh = hasPositive(req.body.dailyHigh) ? Number(req.body.dailyHigh) : null;

    // Validate bid/ask relationship (only when both are real market values)
    if (bid != null && ask != null && bid >= ask) {
      validationErrors.push({
        field: 'currentBid',
        message: 'Bid price must be lower than ask price',
        value: { bid, ask }
      });
    }

    // Validate daily high/low relationship (only when both are real market values)
    if (dailyLow != null && dailyHigh != null && dailyLow >= dailyHigh) {
      validationErrors.push({
        field: 'dailyLow',
        message: 'Daily low must be lower than daily high',
        value: { low: dailyLow, high: dailyHigh }
      });
    }

    // Normalize targets
    const targetsFromBody = Array.isArray(req.body.targets)
      ? req.body.targets.map((v) => parseFloat(v)).filter((n) => Number.isFinite(n) && n >= 0)
      : [];
    const targetPriceNormalized =
      req.body.targetPrice != null && req.body.targetPrice !== '' ? parseFloat(req.body.targetPrice) : undefined;
    const resolvedTargets = targetsFromBody.length > 0
      ? targetsFromBody
      : Number.isFinite(targetPriceNormalized)
        ? [targetPriceNormalized]
        : [];
    if (resolvedTargets.length === 0) {
      validationErrors.push({
        field: 'targets',
        message: 'At least one target price is required',
        value: req.body.targets ?? req.body.targetPrice
      });
    }

    const entry = parseFloat(req.body.entryPrice);
    const stop = parseFloat(req.body.stopLoss);
    const firstTarget = resolvedTargets[0];

    // Validate signal prices based on type
    const sigType = req.body.type || 'buy';
    if (sigType === 'buy' || sigType === 'strong_buy') {
      if (firstTarget <= entry) {
        validationErrors.push({
          field: 'targets',
          message: 'Target price must be higher than entry price for buy signals',
          value: { entry, target: firstTarget }
        });
      }
      if (stop >= entry) {
        validationErrors.push({
          field: 'stopLoss',
          message: 'Stop loss must be lower than entry price for buy signals',
          value: { entry, stopLoss: stop }
        });
      }
    } else if (sigType === 'sell' || sigType === 'strong_sell') {
      if (firstTarget >= entry) {
        validationErrors.push({
          field: 'targets',
          message: 'Target price must be lower than entry price for sell signals',
          value: { entry, target: firstTarget }
        });
      }
      if (stop <= entry) {
        validationErrors.push({
          field: 'stopLoss',
          message: 'Stop loss must be higher than entry price for sell signals',
          value: { entry, stopLoss: stop }
        });
      }
    }

    // Validate current prices are within daily range (with tolerance)
    if (
      bid != null &&
      ask != null &&
      dailyLow != null &&
      dailyHigh != null &&
      (bid < dailyLow * 0.8 || ask > dailyHigh * 1.2)
    ) {
      validationErrors.push({
        field: 'currentBid',
        message: 'Current prices should be reasonably within daily high/low range (allowing 20% tolerance for market volatility)',
        value: { bid, ask, low: dailyLow, high: dailyHigh }
      });
    }

    // Validate optional fields if provided
    if (req.body.positionSize !== undefined && req.body.positionSize < 0) {
      validationErrors.push({
        field: 'positionSize',
        message: 'Position size cannot be negative',
        value: req.body.positionSize
      });
    }

    if (req.body.maxRisk !== undefined && req.body.maxRisk < 0) {
      validationErrors.push({
        field: 'maxRisk',
        message: 'Maximum risk cannot be negative',
        value: req.body.maxRisk
      });
    }

    if (req.body.expectedReturn !== undefined && req.body.expectedReturn < 0) {
      validationErrors.push({
        field: 'expectedReturn',
        message: 'Expected return cannot be negative',
        value: req.body.expectedReturn
      });
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please correct the following errors',
        errors: validationErrors
      });
    }

    // Prepare signal data
    const signalData = {
      ...req.body,
      teacher: req.user._id,
      targets: resolvedTargets,
      targetPrice: resolvedTargets[0]
    };

    // Convert string numbers to actual numbers if needed
    const numericFields = [
      'entryPrice', 'targetPrice', 'stopLoss', 'currentBid', 'currentAsk',
      'dailyHigh', 'dailyLow', 'priceChange', 'priceChangePercent',
      'positionSize', 'maxRisk', 'riskRewardRatio', 'expectedReturn', 'confidence'
    ];
    
    numericFields.forEach(field => {
      if (signalData[field] !== undefined && signalData[field] !== null) {
        const numValue = parseFloat(signalData[field]);
        if (!isNaN(numValue)) {
          signalData[field] = numValue;
        }
      }
    });

    // Treat 0 market-snapshot fields as unset so the model can derive them from entry
    ['currentBid', 'currentAsk', 'dailyHigh', 'dailyLow'].forEach((field) => {
      if (!(Number(signalData[field]) > 0)) {
        delete signalData[field];
      }
    });

    const signal = new TradingSignal(signalData);
    
    try {
      await signal.save();
    } catch (saveError) {
      // Re-throw to be caught by outer catch block
      throw saveError;
    }

    if (signal.isPublished !== false) {
      setImmediate(() => {
        notificationService.notifyNewTradingSignal(signal).catch((err) => {
          console.error('[Signal] Push notify failed:', err.message);
        });
      });
    }

    res.status(201).json({
      message: 'Signal created successfully',
      signal
    });

  } catch (error) {
    console.error('Create signal error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const mongooseErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
        kind: err.kind
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors: mongooseErrors
      });
    }

    // Handle custom pre-save validation errors (from model pre-save hook)
    if (error.message && (
      error.message.includes('must be') || 
      error.message.includes('must be lower') || 
      error.message.includes('must be higher') ||
      error.message.includes('should be reasonably within') ||
      error.message.includes('Bid price') ||
      error.message.includes('Daily low') ||
      error.message.includes('Target price') ||
      error.message.includes('Stop loss')
    )) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message,
        type: 'pre-save-validation',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    // Handle CastError (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid data format',
        message: `Invalid value for ${error.path}: ${error.value}`,
        field: error.path,
        value: error.value
      });
    }

    // Return detailed error in development, generic in production
    res.status(500).json({ 
      error: 'Failed to create signal',
      message: process.env.NODE_ENV === 'development' 
        ? (error.message || 'An unexpected error occurred')
        : 'An unexpected error occurred. Please try again.',
      errorType: error.name,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        errors: error.errors
      } : undefined
    });
  }
});

// @route   PUT /api/signals/:id
// @desc    Update signal
// @access  Private/Instructor (owner)
router.put('/:id', [
  authenticateToken,
  requireOwnership('TradingSignal'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('confidence').optional().isInt({ min: 1, max: 100 }).withMessage('Confidence must be between 1-100'),
  body('entryPrice').optional().isFloat({ min: 0 }).withMessage('Entry price must be a positive number'),
  body('targetPrice').optional().isFloat({ min: 0 }).withMessage('Target price must be a positive number'),
  body('stopLoss').optional().isFloat({ min: 0 }).withMessage('Stop loss must be a positive number'),
  body('currentBid').optional().isFloat({ min: 0 }).withMessage('Current bid price must be a positive number'),
  body('currentAsk').optional().isFloat({ min: 0 }).withMessage('Current ask price must be a positive number'),
  body('dailyHigh').optional().isFloat({ min: 0 }).withMessage('Daily high must be a positive number'),
  body('dailyLow').optional().isFloat({ min: 0 }).withMessage('Daily low must be a positive number'),
  body('positionSize').optional().isFloat({ min: 0 }).withMessage('Position size must be a positive number'),
  body('maxRisk').optional().isFloat({ min: 0 }).withMessage('Maximum risk must be a positive number'),
  body('expectedReturn').optional().isFloat({ min: 0 }).withMessage('Expected return must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }

    const existing = await TradingSignal.findById(req.params.id).select('isPublished');
    if (!existing) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    const wasPublished = !!existing.isPublished;

    const signal = await TradingSignal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('teacher', 'firstName lastName profileImage');

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    if (!wasPublished && signal.isPublished) {
      setImmediate(() => {
        notificationService.notifyNewTradingSignal(signal).catch((err) => {
          console.error('[Signal] Publish push notify failed:', err.message);
        });
      });
    }

    res.json({
      message: 'Signal updated successfully',
      signal
    });

  } catch (error) {
    console.error('Update signal error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const mongooseErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        errors: mongooseErrors
      });
    }

    // Handle custom pre-save validation errors
    if (error.message && error.message.includes('must be')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    res.status(500).json({ 
      error: 'Failed to update signal',
      message: 'An unexpected error occurred. Please try again.'
    });
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
