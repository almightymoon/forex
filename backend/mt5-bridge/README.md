# MT5 REST API Bridge

A Python-based REST API bridge that connects your Node.js backend with MetaTrader 5 terminal.

## Features

- ✅ REST API endpoints for MT5 operations
- ✅ Account management and authentication
- ✅ Market data retrieval (quotes, symbols, historical data)
- ✅ Trade execution (place, close, modify orders)
- ✅ Position and trade history management
- ✅ CORS enabled for cross-origin requests
- ✅ Token-based authentication

## Prerequisites

1. **MetaTrader 5 Terminal** installed and running
2. **Python 3.8+** installed
3. **MT5 Account** (demo or live)

## Installation

1. **Navigate to the bridge directory:**
   ```bash
   cd mt5-bridge
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` file** (optional - for default connection):
   ```env
   PORT=8080
   HOST=0.0.0.0
   DEBUG=False
   ```

## Running the Bridge

### Development Mode

```bash
python app.py
```

The bridge will start on `http://localhost:8080`

### Production Mode

Using Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

## API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST /auth
Body: {
  "login": 12345678,
  "password": "your_password",
  "server": "YourBroker-Demo"
}
Response: {
  "token": "mt5_12345678_1234567890",
  "login": 12345678,
  "server": "YourBroker-Demo"
}
```

### Account Information
```
GET /account/{login}
Headers: Authorization: Bearer {token}
```

### Market Data
```
GET /symbol/{symbol}
POST /quotes
Body: { "symbols": ["EURUSD", "GBPUSD"] }
GET /symbols
POST /history
Body: {
  "symbol": "EURUSD",
  "timeframe": "H1",
  "from": "2024-01-01T00:00:00",
  "to": "2024-01-31T23:59:59"
}
```

### Trading
```
POST /order
Body: {
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": 0.01,
  "price": 0,
  "stopLoss": 1.0800,
  "takeProfit": 1.0900,
  "slippage": 10,
  "comment": "API Order"
}

POST /order/close
Body: {
  "ticket": 123456789,
  "volume": 0
}

POST /order/modify
Body: {
  "ticket": 123456789,
  "stopLoss": 1.0800,
  "takeProfit": 1.0900
}
```

### Positions & History
```
GET /positions/{login}
POST /history/{login}
Body: {
  "from": "2024-01-01T00:00:00",
  "to": "2024-01-31T23:59:59"
}
```

## Integration with Node.js Backend

Update your Node.js `.env` file:

```env
MT5_API_URL=http://localhost:8080
```

The Node.js backend will automatically use this bridge for all MT5 operations.

## Testing

### Test Health Endpoint
```bash
curl http://localhost:8080/health
```

### Test Authentication
```bash
curl -X POST http://localhost:8080/auth \
  -H "Content-Type: application/json" \
  -d '{
    "login": 12345678,
    "password": "your_password",
    "server": "YourBroker-Demo"
  }'
```

### Test Account Info (with token)
```bash
curl http://localhost:8080/account/12345678 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### MT5 Not Initialized
- Ensure MT5 terminal is installed and running
- Check that MT5 is properly installed (not just downloaded)
- Try restarting MT5 terminal

### Connection Failed
- Verify MT5 account credentials
- Check server name is correct
- Ensure MT5 terminal is connected to broker

### Port Already in Use
- Change PORT in `.env` file
- Or stop the service using port 8080

### Import Errors
- Ensure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`
- Check Python version: `python --version` (should be 3.8+)

## Security Notes

⚠️ **Important for Production:**

1. **Use HTTPS** - Don't expose this service over HTTP in production
2. **Implement proper JWT** - Current token system is basic
3. **Add rate limiting** - Prevent abuse
4. **Use environment variables** - Never hardcode credentials
5. **Firewall rules** - Only allow connections from your Node.js backend
6. **Encrypt passwords** - Don't store passwords in plain text

## Development

### Adding New Endpoints

1. Add route handler in `app.py`
2. Use `verify_token()` to check authentication
3. Use MT5 functions from `MetaTrader5` library
4. Return JSON responses

### Logging

Logs are configured to show:
- Info: Normal operations
- Error: Errors and exceptions
- Timestamps for all log entries

## Support

For issues:
1. Check MT5 terminal is running
2. Verify account credentials
3. Check logs for error messages
4. Ensure all dependencies are installed

## License

This bridge is part of the Forex Navigators LMS platform.

