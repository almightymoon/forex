const express = require('express');
const { body, validationResult } = require('express-validator');
const mt5Service = require('../services/mt5Service');
const MT5Account = require('../models/MT5Account');
const MT5Trade = require('../models/MT5Trade');
const TradingSignal = require('../models/TradingSignal');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/mt5/test-connection
// @desc    Test MT5 API connection
// @access  Private
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    const isConnected = await mt5Service.testConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'MT5 connection successful' : 'MT5 connection failed'
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection', message: error.message });
  }
});

// @route   POST /api/mt5/connect
// @desc    Connect MT5 account
// @access  Private
router.post('/connect', [
  authenticateToken,
  body('mt5Login').isNumeric().withMessage('MT5 login must be a number'),
  body('mt5Password').notEmpty().withMessage('MT5 password is required'),
  body('mt5Server').notEmpty().withMessage('MT5 server is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mt5Login, mt5Password, mt5Server } = req.body;

    // Check if account already exists
    let mt5Account = await MT5Account.findOne({ 
      $or: [
        { user: req.user._id },
        { mt5Login: parseInt(mt5Login) }
      ]
    });

    if (mt5Account && mt5Account.user.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: 'This MT5 account is already connected to another user' });
    }

    // Test connection with provided credentials
    const originalPassword = mt5Service.password;
    const originalLogin = mt5Service.login;
    const originalServer = mt5Service.server;
    
    mt5Service.login = mt5Login;
    mt5Service.password = mt5Password;
    mt5Service.server = mt5Server;

    try {
      const accountInfo = await mt5Service.getAccountInfo(mt5Login);
      
      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;

      // Create or update account
      if (mt5Account) {
        mt5Account.mt5Login = parseInt(mt5Login);
        mt5Account.mt5Password = mt5Password;
        mt5Account.mt5Server = mt5Server;
        mt5Account.isVerified = true;
        await mt5Account.updateAccountInfo(accountInfo);
      } else {
        mt5Account = new MT5Account({
          user: req.user._id,
          mt5Login: parseInt(mt5Login),
          mt5Password: mt5Password,
          mt5Server: mt5Server,
          isVerified: true
        });
        await mt5Account.updateAccountInfo(accountInfo);
      }

      res.json({
        message: 'MT5 account connected successfully',
        account: mt5Account
      });
    } catch (error) {
      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;
      
      throw error;
    }
  } catch (error) {
    console.error('Connect MT5 account error:', error);
    
    // Check if it's a connection error (bridge not running)
    if (error.message && (
        error.message.includes('ECONNREFUSED') || 
        error.message.includes('connect') || 
        error.message.includes('BRIDGE_NOT_RUNNING') ||
        error.message.includes('bridge service is not running')
      )) {
      const bridgeMessage = error.message.includes('bridge service is not running')
        ? error.message.replace('MT5 API Error: ', '').replace('BRIDGE_NOT_RUNNING: ', '')
        : 'The MT5 bridge service is not running. Please ensure the MT5 Python bridge is started on port 8080.';
      
      return res.status(503).json({ 
        error: 'MT5 Bridge Service Unavailable',
        message: bridgeMessage,
        code: 'BRIDGE_NOT_RUNNING'
      });
    }
    
    // Check if it's an authentication error
    if (error.message && error.message.includes('authentication failed')) {
      return res.status(401).json({ 
        error: 'MT5 Authentication Failed',
        message: 'Invalid MT5 credentials. Please check your login, password, and server name.',
        code: 'AUTH_FAILED'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to connect MT5 account',
      message: error.message 
    });
  }
});

// @route   GET /api/mt5/account
// @desc    Get user's MT5 account information
// @access  Private
router.get('/account', authenticateToken, async (req, res) => {
  try {
    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    // Update account info from MT5
    try {
      const accountInfo = await mt5Service.getAccountInfo(mt5Account.mt5Login);
      await mt5Account.updateAccountInfo(accountInfo);
    } catch (error) {
      console.error('Failed to update account info:', error);
      // Continue with cached info
    }

    res.json(mt5Account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
});

// @route   PUT /api/mt5/account/settings
// @desc    Update MT5 account settings
// @access  Private
router.put('/account/settings', authenticateToken, async (req, res) => {
  try {
    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    // Update copy trading settings
    if (req.body.copyTradingEnabled !== undefined) {
      mt5Account.copyTradingEnabled = req.body.copyTradingEnabled;
    }

    if (req.body.copyTradingSettings) {
      mt5Account.copyTradingSettings = {
        ...mt5Account.copyTradingSettings,
        ...req.body.copyTradingSettings
      };
    }

    if (req.body.riskSettings) {
      mt5Account.riskSettings = {
        ...mt5Account.riskSettings,
        ...req.body.riskSettings
      };
    }

    await mt5Account.save();

    res.json({
      message: 'Settings updated successfully',
      account: mt5Account
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// @route   GET /api/mt5/quotes
// @desc    Get market quotes (GET method for query params)
// @access  Private
router.get('/quotes', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter is required' });
    }

    const symbolsArray = Array.isArray(symbols) ? symbols : symbols.split(',');
    const quotes = await mt5Service.getMarketQuotes(symbolsArray);

    res.json(quotes);
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to get quotes', message: error.message });
  }
});

// @route   POST /api/mt5/quotes
// @desc    Get market quotes (POST method for body)
// @access  Private
router.post('/quotes', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }

    try {
      const quotes = await mt5Service.getMarketQuotes(symbols);
      res.json(quotes);
    } catch (bridgeError) {
      console.error('MT5 Bridge error for quotes:', bridgeError);
      // Return mock quotes when bridge fails
      const mockQuotes = symbols.map(symbol => ({
        symbol: symbol.toUpperCase(),
        bid: symbol.includes('EUR') ? 1.1000 : symbol.includes('GBP') ? 1.3000 : symbol.includes('AUD') ? 0.7500 : symbol.includes('USD') ? 1.0000 : 1.1000,
        ask: symbol.includes('EUR') ? 1.1005 : symbol.includes('GBP') ? 1.3005 : symbol.includes('AUD') ? 0.7505 : symbol.includes('USD') ? 1.0005 : 1.1005,
        time: new Date().toISOString()
      }));
      res.json(mockQuotes);
    }
  } catch (error) {
    console.error('Get quotes error:', error);
    // Return mock quotes when error occurs
    const { symbols = [] } = req.body;
    const mockQuotes = symbols.map(symbol => ({
      symbol: symbol.toUpperCase(),
      bid: symbol.includes('EUR') ? 1.1000 : symbol.includes('GBP') ? 1.3000 : symbol.includes('AUD') ? 0.7500 : symbol.includes('USD') ? 1.0000 : 1.1000,
      ask: symbol.includes('EUR') ? 1.1005 : symbol.includes('GBP') ? 1.3005 : symbol.includes('AUD') ? 0.7505 : symbol.includes('USD') ? 1.0005 : 1.1005,
      time: new Date().toISOString()
    }));
    res.json(mockQuotes);
  }
});

// @route   GET /api/mt5/symbols
// @desc    Get available symbols
// @access  Private
router.get('/symbols', authenticateToken, async (req, res) => {
  try {
    const symbols = await mt5Service.getSymbols();
    res.json(symbols);
  } catch (error) {
    console.error('Get symbols error:', error);
    res.status(500).json({ error: 'Failed to get symbols', message: error.message });
  }
});

// @route   GET /api/mt5/history
// @desc    Get historical data
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { symbol, timeframe, from, to } = req.query;

    if (!symbol || !timeframe) {
      return res.status(400).json({ error: 'Symbol and timeframe are required' });
    }

    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    try {
      const history = await mt5Service.getHistoricalData(symbol, timeframe, fromDate, toDate);
      res.json(history);
    } catch (bridgeError) {
      console.error('MT5 Bridge error for history:', bridgeError);
      // Return empty array instead of error to allow frontend to use real-time fallback
      res.json([]);
    }
  } catch (error) {
    console.error('Get history error:', error);
    // Return empty array instead of error to allow frontend to use real-time fallback
    res.json([]);
  }
});

// @route   GET /api/mt5/positions
// @desc    Get open positions
// @access  Private
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    const positions = await mt5Service.getOpenPositions(mt5Account.mt5Login);

    // Sync with database
    for (const position of positions) {
      await MT5Trade.findOneAndUpdate(
        { mt5Ticket: position.ticket },
        {
          mt5Account: mt5Account._id,
          user: req.user._id,
          mt5Ticket: position.ticket,
          mt5Login: mt5Account.mt5Login,
          symbol: position.symbol,
          type: position.type,
          volume: position.volume,
          openPrice: position.priceOpen,
          currentPrice: position.priceCurrent,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          profit: position.profit,
          swap: position.swap,
          commission: position.commission,
          openTime: new Date(position.time),
          status: 'open',
          comment: position.comment || ''
        },
        { upsert: true, new: true }
      );
    }

    const dbPositions = await MT5Trade.find({
      mt5Account: mt5Account._id,
      status: 'open'
    }).sort({ openTime: -1 });

    res.json(dbPositions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Failed to get positions', message: error.message });
  }
});

// @route   POST /api/mt5/order
// @desc    Place an order
// @access  Private
router.post('/order', [
  authenticateToken,
  body('symbol').notEmpty().withMessage('Symbol is required'),
  body('type').isIn(['BUY', 'SELL']).withMessage('Type must be BUY or SELL'),
  body('volume').isFloat({ min: 0.01 }).withMessage('Volume must be at least 0.01')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account || !mt5Account.isVerified) {
      return res.status(404).json({ error: 'MT5 account not found or not verified' });
    }

    // Check if trade is allowed
    const canTrade = mt5Account.canPlaceTrade(req.body.symbol, req.body.volume);
    if (!canTrade.allowed) {
      return res.status(400).json({ error: canTrade.reason });
    }

    // Temporarily set credentials for this request
    const originalPassword = mt5Service.password;
    const originalLogin = mt5Service.login;
    const originalServer = mt5Service.server;
    
    mt5Service.login = mt5Account.mt5Login;
    mt5Service.password = mt5Account.mt5Password;
    mt5Service.server = mt5Account.mt5Server;

    try {
      const orderResult = await mt5Service.placeOrder({
        login: mt5Account.mt5Login,
        symbol: req.body.symbol,
        type: req.body.type,
        volume: req.body.volume,
        price: req.body.price || 0,
        slippage: req.body.slippage || 10,
        stopLoss: req.body.stopLoss || 0,
        takeProfit: req.body.takeProfit || 0,
        comment: req.body.comment || 'Web Platform Order'
      });

      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;

      // Save trade to database
      const trade = new MT5Trade({
        mt5Account: mt5Account._id,
        user: req.user._id,
        mt5Ticket: orderResult.ticket,
        mt5Login: mt5Account.mt5Login,
        symbol: req.body.symbol,
        type: req.body.type,
        volume: req.body.volume,
        openPrice: orderResult.price,
        stopLoss: req.body.stopLoss || 0,
        takeProfit: req.body.takeProfit || 0,
        openTime: new Date(),
        status: 'open',
        comment: req.body.comment || 'Web Platform Order',
        isCopyTrade: req.body.isCopyTrade || false,
        sourceSignal: req.body.sourceSignal || null
      });

      await trade.save();

      // Refresh account info from MT5 to get updated balance
      try {
        const originalPassword = mt5Service.password;
        const originalLogin = mt5Service.login;
        const originalServer = mt5Service.server;
        
        mt5Service.login = mt5Account.mt5Login;
        mt5Service.password = mt5Account.mt5Password;
        mt5Service.server = mt5Account.mt5Server;

        const accountInfo = await mt5Service.getAccountInfo(mt5Account.mt5Login);
        
        // Restore original credentials
        mt5Service.login = originalLogin;
        mt5Service.password = originalPassword;
        mt5Service.server = originalServer;

        // Update account info in database
        mt5Account.accountInfo = {
          balance: accountInfo.balance || mt5Account.accountInfo.balance,
          equity: accountInfo.equity || mt5Account.accountInfo.equity,
          margin: accountInfo.margin || mt5Account.accountInfo.margin,
          freeMargin: accountInfo.freeMargin || mt5Account.accountInfo.freeMargin,
          marginLevel: accountInfo.marginLevel || mt5Account.accountInfo.marginLevel,
          currency: accountInfo.currency || mt5Account.accountInfo.currency,
          leverage: accountInfo.leverage || mt5Account.accountInfo.leverage
        };
        await mt5Account.save();
      } catch (accountError) {
        console.error('Failed to refresh account info after order placement:', accountError);
        // Don't fail the order placement if account refresh fails
      }

      res.json({
        message: 'Order placed successfully',
        trade,
        mt5Result: orderResult
      });
    } catch (error) {
      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;
      
      throw error;
    }
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ error: 'Failed to place order', message: error.message });
  }
});

// @route   POST /api/mt5/order/close
// @desc    Close an order
// @access  Private
router.post('/order/close', [
  authenticateToken,
  body('ticket').isNumeric().withMessage('Ticket must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    const trade = await MT5Trade.findOne({
      mt5Ticket: req.body.ticket,
      mt5Account: mt5Account._id
    });

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Temporarily set credentials
    const originalPassword = mt5Service.password;
    const originalLogin = mt5Service.login;
    const originalServer = mt5Service.server;
    
    mt5Service.login = mt5Account.mt5Login;
    mt5Service.password = mt5Account.mt5Password;
    mt5Service.server = mt5Account.mt5Server;

    try {
      const closeResult = await mt5Service.closeOrder(
        mt5Account.mt5Login,
        req.body.ticket,
        req.body.volume || 0
      );

      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;

      // Update trade in database
      trade.status = 'closed';
      trade.closePrice = closeResult.price;
      trade.closeTime = new Date();
      trade.profit = closeResult.profit;
      await trade.save();

      // Update account statistics
      await mt5Account.updateStatistics({ profit: closeResult.profit });

      // Refresh account info from MT5 to get updated balance
      try {
        const accountInfo = await mt5Service.getAccountInfo(mt5Account.mt5Login);
        
        // Update account info in database
        mt5Account.accountInfo = {
          balance: accountInfo.balance || mt5Account.accountInfo.balance,
          equity: accountInfo.equity || mt5Account.accountInfo.equity,
          margin: accountInfo.margin || mt5Account.accountInfo.margin,
          freeMargin: accountInfo.freeMargin || mt5Account.accountInfo.freeMargin,
          marginLevel: accountInfo.marginLevel || mt5Account.accountInfo.marginLevel,
          currency: accountInfo.currency || mt5Account.accountInfo.currency,
          leverage: accountInfo.leverage || mt5Account.accountInfo.leverage
        };
        await mt5Account.save();
      } catch (accountError) {
        console.error('Failed to refresh account info after closing position:', accountError);
        // Don't fail the position close if account refresh fails
      }

      res.json({
        message: 'Order closed successfully',
        trade,
        mt5Result: closeResult
      });
    } catch (error) {
      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;
      
      throw error;
    }
  } catch (error) {
    console.error('Close order error:', error);
    res.status(500).json({ error: 'Failed to close order', message: error.message });
  }
});

// @route   DELETE /api/mt5/account
// @desc    Disconnect MT5 account
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    // Delete all associated trades
    await MT5Trade.deleteMany({ mt5Account: mt5Account._id });

    // Delete the account
    await MT5Account.deleteOne({ _id: mt5Account._id });

    res.json({
      message: 'MT5 account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect MT5 account error:', error);
    res.status(500).json({ error: 'Failed to disconnect MT5 account', message: error.message });
  }
});

// @route   GET /api/mt5/trades
// @desc    Get trade history
// @access  Private
router.get('/trades', authenticateToken, async (req, res) => {
  try {
    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account) {
      return res.status(404).json({ error: 'MT5 account not found' });
    }

    const { status, symbol, from, to, limit = 50 } = req.query;

    const query = {
      mt5Account: mt5Account._id
    };

    if (status) {
      query.status = status;
    }

    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }

    if (from || to) {
      query.openTime = {};
      if (from) query.openTime.$gte = new Date(from);
      if (to) query.openTime.$lte = new Date(to);
    }

    const trades = await MT5Trade.find(query)
      .populate('sourceSignal', 'symbol type entryPrice targetPrice stopLoss')
      .sort({ openTime: -1 })
      .limit(parseInt(limit));

    res.json(trades);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// @route   POST /api/mt5/copy-trade
// @desc    Execute copy trade from signal
// @access  Private
router.post('/copy-trade', [
  authenticateToken,
  body('signalId').notEmpty().withMessage('Signal ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mt5Account = await MT5Account.findOne({ user: req.user._id });
    
    if (!mt5Account || !mt5Account.isVerified) {
      return res.status(404).json({ error: 'MT5 account not found or not verified' });
    }

    if (!mt5Account.copyTradingEnabled) {
      return res.status(400).json({ error: 'Copy trading is not enabled for this account' });
    }

    const signal = await TradingSignal.findById(req.body.signalId);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Check if trade is allowed
    const canTrade = mt5Account.canPlaceTrade(signal.symbol, signal.positionSize || 0.01);
    if (!canTrade.allowed) {
      return res.status(400).json({ error: canTrade.reason });
    }

    // Calculate position size based on risk settings
    const accountInfo = mt5Account.accountInfo;
    const riskAmount = (accountInfo.balance * mt5Account.copyTradingSettings.maxRiskPercent) / 100;
    
    // Calculate volume based on risk
    const priceDifference = Math.abs(signal.entryPrice - signal.stopLoss);
    const volume = mt5Account.copyTradingSettings.multiplier * (signal.positionSize || 0.01);

    // Temporarily set credentials
    const originalPassword = mt5Service.password;
    const originalLogin = mt5Service.login;
    const originalServer = mt5Service.server;
    
    mt5Service.login = mt5Account.mt5Login;
    mt5Service.password = mt5Account.mt5Password;
    mt5Service.server = mt5Account.mt5Server;

    try {
      const orderResult = await mt5Service.placeOrder({
        login: mt5Account.mt5Login,
        symbol: signal.symbol,
        type: signal.type === 'buy' || signal.type === 'strong_buy' ? 'BUY' : 'SELL',
        volume: volume,
        price: 0, // Market order
        slippage: 10,
        stopLoss: signal.stopLoss,
        takeProfit: signal.targetPrice,
        comment: `Copy Trade: ${signal._id}`
      });

      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;

      // Save trade to database
      const trade = new MT5Trade({
        mt5Account: mt5Account._id,
        user: req.user._id,
        mt5Ticket: orderResult.ticket,
        mt5Login: mt5Account.mt5Login,
        symbol: signal.symbol,
        type: signal.type === 'buy' || signal.type === 'strong_buy' ? 'BUY' : 'SELL',
        volume: volume,
        openPrice: orderResult.price,
        stopLoss: signal.stopLoss,
        takeProfit: signal.targetPrice,
        openTime: new Date(),
        status: 'open',
        comment: `Copy Trade: ${signal._id}`,
        isCopyTrade: true,
        sourceSignal: signal._id,
        riskAmount: riskAmount,
        riskPercent: mt5Account.copyTradingSettings.maxRiskPercent
      });

      await trade.save();

      res.json({
        message: 'Copy trade executed successfully',
        trade,
        mt5Result: orderResult
      });
    } catch (error) {
      // Restore original credentials
      mt5Service.login = originalLogin;
      mt5Service.password = originalPassword;
      mt5Service.server = originalServer;
      
      throw error;
    }
  } catch (error) {
    console.error('Copy trade error:', error);
    res.status(500).json({ error: 'Failed to execute copy trade', message: error.message });
  }
});

module.exports = router;

