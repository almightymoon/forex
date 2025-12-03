const axios = require('axios');

/**
 * MT5 Service - Handles communication with MetaTrader 5 REST API
 * 
 * This service provides methods to interact with MT5 terminal via REST API.
 * Requires MT5 terminal to be running with REST API enabled.
 */
class MT5Service {
  constructor() {
    // MT5 REST API configuration
    // These should be set in environment variables
    this.baseUrl = process.env.MT5_API_URL || 'http://localhost:8080';
    this.login = process.env.MT5_LOGIN || '';
    this.password = process.env.MT5_PASSWORD || '';
    this.server = process.env.MT5_SERVER || '';
    
    // Cache for authentication token
    this.authToken = null;
    this.tokenExpiry = null;
    
    // Request timeout
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Authenticate with MT5 REST API
   * @returns {Promise<string>} Authentication token
   */
  async authenticate() {
    try {
      // If we have a valid token, return it
      if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.authToken;
      }

      const response = await axios.post(
        `${this.baseUrl}/auth`,
        {
          login: this.login,
          password: this.password,
          server: this.server
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        // Token expires in 1 hour (3600000 ms), refresh 5 minutes before
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        return this.authToken;
      }

      throw new Error('Failed to authenticate with MT5');
    } catch (error) {
      console.error('MT5 Authentication Error:', error.message);
      
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        throw new Error(`MT5 bridge service is not running. Please start the MT5 Python bridge on port ${this.baseUrl.split(':').pop() || '8080'}.`);
      }
      
      throw new Error(`MT5 authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated request to MT5 API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} API response
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const token = await this.authenticate();
      
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`MT5 API Error (${endpoint}):`, error.message);
      if (error.response) {
        throw new Error(`MT5 API Error: ${error.response.data?.message || error.response.statusText}`);
      }
      throw new Error(`MT5 API Error: ${error.message}`);
    }
  }

  /**
   * Get account information
   * @param {number} login - MT5 account login
   * @returns {Promise<object>} Account information
   */
  async getAccountInfo(login) {
    try {
      const response = await this.makeRequest(`/account/${login}`, 'GET');
      return response;
    } catch (error) {
      console.error('Get Account Info Error:', error);
      throw error;
    }
  }

  /**
   * Get symbol information
   * @param {string} symbol - Trading symbol (e.g., 'EURUSD')
   * @returns {Promise<object>} Symbol information
   */
  async getSymbolInfo(symbol) {
    try {
      const response = await this.makeRequest(`/symbol/${symbol}`, 'GET');
      return response;
    } catch (error) {
      console.error('Get Symbol Info Error:', error);
      throw error;
    }
  }

  /**
   * Get current market prices (quotes)
   * @param {string|Array<string>} symbols - Symbol(s) to get quotes for
   * @returns {Promise<object|Array>} Market quotes
   */
  async getMarketQuotes(symbols) {
    try {
      const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];
      const response = await this.makeRequest(
        `/quotes`,
        'POST',
        { symbols: symbolsArray }
      );
      return response;
    } catch (error) {
      console.error('Get Market Quotes Error:', error);
      throw error;
    }
  }

  /**
   * Get historical data (candles)
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe (M1, M5, M15, M30, H1, H4, D1, W1, MN1)
   * @param {Date} from - Start date
   * @param {Date} to - End date
   * @returns {Promise<Array>} Historical candles
   */
  async getHistoricalData(symbol, timeframe, from, to) {
    try {
      const response = await this.makeRequest(
        `/history`,
        'POST',
        {
          symbol,
          timeframe,
          from: from.toISOString(),
          to: to.toISOString()
        }
      );
      return response;
    } catch (error) {
      console.error('Get Historical Data Error:', error);
      throw error;
    }
  }

  /**
   * Place a market order
   * @param {object} orderData - Order parameters
   * @param {number} orderData.login - Account login
   * @param {string} orderData.symbol - Trading symbol
   * @param {string} orderData.type - Order type (BUY, SELL)
   * @param {number} orderData.volume - Volume in lots
   * @param {number} orderData.price - Price (0 for market order)
   * @param {number} orderData.slippage - Maximum slippage
   * @param {number} orderData.stopLoss - Stop loss price
   * @param {number} orderData.takeProfit - Take profit price
   * @param {string} orderData.comment - Order comment
   * @returns {Promise<object>} Order result
   */
  async placeOrder(orderData) {
    try {
      const response = await this.makeRequest(
        `/order`,
        'POST',
        {
          login: orderData.login,
          symbol: orderData.symbol,
          type: orderData.type,
          volume: orderData.volume,
          price: orderData.price || 0,
          slippage: orderData.slippage || 10,
          stopLoss: orderData.stopLoss || 0,
          takeProfit: orderData.takeProfit || 0,
          comment: orderData.comment || 'MT5 API Order'
        }
      );
      return response;
    } catch (error) {
      console.error('Place Order Error:', error);
      throw error;
    }
  }

  /**
   * Close an order/position
   * @param {number} login - Account login
   * @param {number} ticket - Order ticket number
   * @param {number} volume - Volume to close (0 for full close)
   * @returns {Promise<object>} Close result
   */
  async closeOrder(login, ticket, volume = 0) {
    try {
      const response = await this.makeRequest(
        `/order/close`,
        'POST',
        {
          login,
          ticket,
          volume
        }
      );
      return response;
    } catch (error) {
      console.error('Close Order Error:', error);
      throw error;
    }
  }

  /**
   * Modify an order
   * @param {number} login - Account login
   * @param {number} ticket - Order ticket number
   * @param {number} stopLoss - New stop loss
   * @param {number} takeProfit - New take profit
   * @returns {Promise<object>} Modify result
   */
  async modifyOrder(login, ticket, stopLoss, takeProfit) {
    try {
      const response = await this.makeRequest(
        `/order/modify`,
        'POST',
        {
          login,
          ticket,
          stopLoss,
          takeProfit
        }
      );
      return response;
    } catch (error) {
      console.error('Modify Order Error:', error);
      throw error;
    }
  }

  /**
   * Get open positions
   * @param {number} login - Account login
   * @returns {Promise<Array>} Open positions
   */
  async getOpenPositions(login) {
    try {
      const response = await this.makeRequest(`/positions/${login}`, 'GET');
      return response;
    } catch (error) {
      console.error('Get Open Positions Error:', error);
      throw error;
    }
  }

  /**
   * Get order history
   * @param {number} login - Account login
   * @param {Date} from - Start date
   * @param {Date} to - End date
   * @returns {Promise<Array>} Order history
   */
  async getOrderHistory(login, from, to) {
    try {
      const response = await this.makeRequest(
        `/history/${login}`,
        'POST',
        {
          from: from.toISOString(),
          to: to.toISOString()
        }
      );
      return response;
    } catch (error) {
      console.error('Get Order History Error:', error);
      throw error;
    }
  }

  /**
   * Get available symbols
   * @returns {Promise<Array>} Available symbols
   */
  async getSymbols() {
    try {
      const response = await this.makeRequest('/symbols', 'GET');
      return response;
    } catch (error) {
      console.error('Get Symbols Error:', error);
      throw error;
    }
  }

  /**
   * Calculate position size based on risk
   * @param {object} params - Calculation parameters
   * @param {number} params.accountBalance - Account balance
   * @param {number} params.riskPercent - Risk percentage (e.g., 1 for 1%)
   * @param {number} params.entryPrice - Entry price
   * @param {number} params.stopLoss - Stop loss price
   * @param {number} params.symbol - Trading symbol
   * @returns {Promise<number>} Calculated lot size
   */
  async calculatePositionSize(params) {
    try {
      const symbolInfo = await this.getSymbolInfo(params.symbol);
      const contractSize = symbolInfo.contractSize || 100000;
      const tickSize = symbolInfo.tickSize || 0.00001;
      
      const riskAmount = (params.accountBalance * params.riskPercent) / 100;
      const priceDifference = Math.abs(params.entryPrice - params.stopLoss);
      const tickValue = (contractSize * tickSize) / symbolInfo.tickValue || 1;
      
      const lots = riskAmount / (priceDifference * tickValue * contractSize);
      
      // Round to nearest lot step
      const lotStep = symbolInfo.lotStep || 0.01;
      return Math.floor(lots / lotStep) * lotStep;
    } catch (error) {
      console.error('Calculate Position Size Error:', error);
      throw error;
    }
  }

  /**
   * Test connection to MT5 API
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      console.error('MT5 Connection Test Failed:', error);
      return false;
    }
  }
}

module.exports = new MT5Service();

