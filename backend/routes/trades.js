const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Trade = require('../models/Trade');
const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/trades
// @desc    Get user's trades
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, symbol, limit = 50, page = 1 } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const trades = await Trade.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Trade.countDocuments(query);
    
    res.json({
      trades,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// @route   GET /api/trades/stats
// @desc    Get user's trading statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Trade.getUserStats(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error('Get trade stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// @route   GET /api/trades/:id
// @desc    Get single trade
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    
    res.json(trade);
  } catch (error) {
    console.error('Get trade error:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

// @route   POST /api/trades
// @desc    Create new trade
// @access  Private
router.post('/', [
  authenticateToken,
  body('symbol').notEmpty().trim().withMessage('Symbol is required'),
  body('type').isIn(['buy', 'sell']).withMessage('Type must be buy or sell'),
  body('entryPrice').isFloat({ min: 0 }).withMessage('Entry price must be positive'),
  body('lotSize').isFloat({ min: 0.01 }).withMessage('Lot size must be at least 0.01'),
  body('stopLoss').optional().isFloat({ min: 0 }),
  body('takeProfit').optional().isFloat({ min: 0 }),
  body('leverage').optional().isFloat({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { symbol, type, entryPrice, lotSize, stopLoss, takeProfit, leverage, notes } = req.body;
    
    // Calculate margin required
    const lotValue = 100000; // Standard forex lot
    const notionalValue = entryPrice * lotSize * lotValue;
    const margin = notionalValue / (leverage || 1);
    
    // Check if user has sufficient balance
    const user = await User.findById(req.user._id);
    if (user.balance < margin) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: margin,
        available: user.balance
      });
    }
    
    // Create trade
    const trade = new Trade({
      user: req.user._id,
      symbol: symbol.toUpperCase(),
      type,
      entryPrice,
      lotSize,
      stopLoss,
      takeProfit,
      leverage: leverage || 1,
      margin,
      notes,
      platform: 'web',
      ipAddress: req.ip
    });
    
    await trade.save();
    
    // Deduct margin from user balance (create balance transaction)
    await BalanceTransaction.createTransaction({
      user: req.user._id,
      type: 'adjustment',
      amount: -margin,
      description: `Margin for ${type.toUpperCase()} ${lotSize} lots ${symbol}`,
      notes: `Trade ID: ${trade._id}`,
      metadata: {
        tradeId: trade._id.toString(),
        symbol,
        type,
        lotSize: lotSize.toString(),
        entryPrice: entryPrice.toString()
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Trade opened successfully',
      trade
    });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// @route   PUT /api/trades/:id/close
// @desc    Close a trade
// @access  Private
router.put('/:id/close', [
  authenticateToken,
  body('exitPrice').isFloat({ min: 0 }).withMessage('Exit price must be positive'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { exitPrice, notes } = req.body;
    
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'open'
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Open trade not found' });
    }
    
    // Close the trade
    await trade.close(exitPrice, notes);
    
    // Return margin and add/deduct profit/loss
    const totalReturn = trade.margin + trade.netProfitLoss;
    
    await BalanceTransaction.createTransaction({
      user: req.user._id,
      type: trade.netProfitLoss >= 0 ? 'credit' : 'debit',
      amount: Math.abs(totalReturn),
      description: `Closed ${trade.type.toUpperCase()} ${trade.lotSize} lots ${trade.symbol}`,
      notes: `Trade ID: ${trade._id}, P/L: $${trade.netProfitLoss.toFixed(2)}`,
      metadata: {
        tradeId: trade._id.toString(),
        symbol: trade.symbol,
        type: trade.type,
        lotSize: trade.lotSize.toString(),
        entryPrice: trade.entryPrice.toString(),
        exitPrice: exitPrice.toString(),
        profitLoss: trade.netProfitLoss.toString()
      }
    });
    
    // Send notification
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendNotificationToUser(req.user._id, 'trade', {
        title: trade.netProfitLoss >= 0 ? 'Trade Closed - Profit!' : 'Trade Closed - Loss',
        message: `${trade.symbol} ${trade.type.toUpperCase()} trade closed. P/L: $${trade.netProfitLoss.toFixed(2)}`,
        tradeId: trade._id,
        symbol: trade.symbol,
        profitLoss: trade.netProfitLoss
      });
    } catch (notifError) {
      console.error('Failed to send trade notification:', notifError);
    }
    
    res.json({
      success: true,
      message: 'Trade closed successfully',
      trade
    });
  } catch (error) {
    console.error('Close trade error:', error);
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

// @route   PUT /api/trades/:id/stop-loss
// @desc    Update stop loss
// @access  Private
router.put('/:id/stop-loss', [
  authenticateToken,
  body('stopLoss').isFloat({ min: 0 }).withMessage('Stop loss must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'open'
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Open trade not found' });
    }
    
    await trade.updateStopLoss(req.body.stopLoss);
    
    res.json({
      success: true,
      message: 'Stop loss updated',
      trade
    });
  } catch (error) {
    console.error('Update stop loss error:', error);
    res.status(500).json({ error: 'Failed to update stop loss' });
  }
});

// @route   PUT /api/trades/:id/take-profit
// @desc    Update take profit
// @access  Private
router.put('/:id/take-profit', [
  authenticateToken,
  body('takeProfit').isFloat({ min: 0 }).withMessage('Take profit must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'open'
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Open trade not found' });
    }
    
    await trade.updateTakeProfit(req.body.takeProfit);
    
    res.json({
      success: true,
      message: 'Take profit updated',
      trade
    });
  } catch (error) {
    console.error('Update take profit error:', error);
    res.status(500).json({ error: 'Failed to update take profit' });
  }
});

// @route   DELETE /api/trades/:id
// @desc    Cancel pending trade
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'pending'
    });
    
    if (!trade) {
      return res.status(404).json({ error: 'Pending trade not found' });
    }
    
    trade.status = 'cancelled';
    await trade.save();
    
    res.json({
      success: true,
      message: 'Trade cancelled',
      trade
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    res.status(500).json({ error: 'Failed to cancel trade' });
  }
});

module.exports = router;
