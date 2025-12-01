# MT5 Integration Setup Guide

## Current Status ✅

The MT5 integration code is **complete** and ready to use. Here's what's been implemented:

### Backend ✅
- ✅ MT5 Service (`services/mt5Service.js`) - API communication layer
- ✅ MT5 Models (`models/MT5Account.js`, `models/MT5Trade.js`) - Database schemas
- ✅ MT5 Routes (`routes/mt5.js`) - API endpoints
- ✅ Server integration - Routes added to `server.js`

### Frontend ✅
- ✅ MT5 Dashboard Page (`/mt5`) - Full account management interface
- ✅ MT5 Tab in Dashboard Navigation - Easy access
- ✅ Copy Trade Integration - One-click copy from signals
- ✅ Copy Trade Buttons - Added to signal cards

## What You Need to Do Next

### Option 1: Use MT5 REST API Bridge (Recommended)

MT5 doesn't have a built-in REST API, so you need a bridge service. Here are your options:

#### A. Use a Third-Party MT5 REST API Service

**Popular Options:**
1. **MT5 REST API Bridge** (Commercial)
   - Services like `mt5api.com` or similar
   - Provides REST API endpoints for MT5
   - Usually requires subscription

2. **Self-Hosted MT5 REST API Bridge**
   - Use open-source solutions like:
     - `mt5-rest-api` (GitHub projects)
     - Custom MQL5 Expert Advisor with HTTP server

#### B. Create Your Own MT5 REST API Bridge

**Using MQL5 Expert Advisor:**

1. **Create an MQL5 EA** that:
   - Listens for HTTP requests
   - Executes MT5 operations
   - Returns JSON responses

2. **Install the EA** on MT5 terminal
3. **Configure** the EA to run on a specific port
4. **Update** `MT5_API_URL` in your `.env` file

### Option 2: Use Python MetaTrader5 Library (Alternative)

If you prefer Python, you can create a Python microservice:

1. **Install Python MT5 library:**
   ```bash
   pip install MetaTrader5
   ```

2. **Create Python REST API** using Flask/FastAPI
3. **Connect to MT5** using the library
4. **Expose REST endpoints** that your Node.js backend calls

### Option 3: Use MT5 Manager API (Advanced)

For production environments:
- Use MT5 Manager API (C++ DLL)
- Create a Node.js native addon wrapper
- More complex but more powerful

## Quick Start (Recommended Approach)

### Step 1: Set Up Environment Variables

Add to your `.env` file:

```env
# MT5 REST API Configuration
MT5_API_URL=http://localhost:8080
MT5_LOGIN=your-default-mt5-login
MT5_PASSWORD=your-default-mt5-password
MT5_SERVER=your-default-mt5-server
```

**Note:** These are default values. Users will connect their own accounts through the UI.

### Step 2: Choose Your MT5 Bridge Solution

**For Testing/Development:**
- Use a demo MT5 account
- Set up a simple REST API bridge (MQL5 EA or Python service)
- Test with `localhost`

**For Production:**
- Use a commercial MT5 REST API service
- Or deploy your own bridge service
- Ensure proper security and authentication

### Step 3: Test the Connection

1. **Start your backend server:**
   ```bash
   npm run dev
   ```

2. **Test MT5 connection endpoint:**
   ```bash
   curl -X GET http://localhost:4000/api/mt5/test-connection \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Or test through the UI:**
   - Navigate to `/mt5` page
   - Click "Connect MT5 Account"
   - Enter credentials

### Step 4: User Flow

Once set up, users can:

1. **Connect Account:**
   - Go to Dashboard → MT5 tab
   - Click "Connect MT5 Account"
   - Enter MT5 login, password, server

2. **View Dashboard:**
   - See account balance, equity, margin
   - View open positions
   - Check trading statistics

3. **Copy Trades:**
   - Go to Trading Signals
   - Click "Copy Trade" on any signal
   - Trade executes automatically

4. **Configure Settings:**
   - Enable/disable copy trading
   - Set risk management parameters
   - Configure symbol filters

## Important Notes

### Security ⚠️

1. **MT5 Credentials:**
   - Passwords are stored in database (consider encryption)
   - Use HTTPS in production
   - Implement proper authentication

2. **API Security:**
   - Protect REST API endpoints
   - Use JWT authentication
   - Rate limit API calls

3. **Trade Execution:**
   - Validate all trades before execution
   - Implement risk limits
   - Log all trading activity

### MT5 REST API Bridge Requirements

Your bridge service should support:

**Authentication:**
```
POST /auth
Body: { login, password, server }
Response: { token }
```

**Account Info:**
```
GET /account/{login}
Headers: { Authorization: Bearer {token} }
```

**Market Data:**
```
GET /symbol/{symbol}
POST /quotes
Body: { symbols: [] }
```

**Trading:**
```
POST /order
Body: { login, symbol, type, volume, price, stopLoss, takeProfit }
POST /order/close
Body: { login, ticket, volume }
```

**History:**
```
POST /history
Body: { symbol, timeframe, from, to }
GET /positions/{login}
GET /history/{login}
```

## Testing Without MT5 Bridge

If you want to test the UI without a real MT5 connection:

1. **Mock the MT5 Service:**
   - Create a mock version of `mt5Service.js`
   - Return sample data
   - Test UI functionality

2. **Use Demo Mode:**
   - Add a `DEMO_MODE` flag
   - Return simulated data
   - Allow UI testing

## Next Steps Checklist

- [ ] Choose MT5 REST API bridge solution
- [ ] Set up MT5 REST API service
- [ ] Configure environment variables
- [ ] Test connection endpoint
- [ ] Test account connection through UI
- [ ] Test market data retrieval
- [ ] Test trade execution (with demo account)
- [ ] Test copy trading functionality
- [ ] Set up production MT5 bridge
- [ ] Configure security settings
- [ ] Test with real accounts
- [ ] Deploy to production

## Support Resources

- **MT5 Documentation:** https://www.metatrader5.com/
- **MQL5 Documentation:** https://www.mql5.com/en/docs
- **Python MT5 Library:** https://pypi.org/project/MetaTrader5/
- **MT5 REST API Examples:** Search GitHub for "mt5 rest api"

## Questions?

If you need help:
1. Check the `MT5_INTEGRATION.md` file for API details
2. Review error messages in server logs
3. Test endpoints individually
4. Verify MT5 bridge is running and accessible

