# MT5 Integration Guide

This document explains how to integrate and use MetaTrader 5 (MT5) with the Forex Navigators LMS platform.

## Overview

The MT5 integration allows users to:
- Connect their MT5 trading accounts
- View real-time market data and quotes
- Execute trades directly from the platform
- Copy trade from trading signals automatically
- Monitor open positions and account balance
- View trade history and statistics

## Prerequisites

1. **MT5 Terminal**: Users need a MetaTrader 5 terminal installed
2. **MT5 REST API**: The MT5 terminal must have REST API enabled
3. **MT5 Account**: Users need valid MT5 account credentials (login, password, server)

## Setup Instructions

### 1. Backend Configuration

Add the following environment variables to your `.env` file:

```env
# MT5 REST API Configuration
MT5_API_URL=http://localhost:8080
MT5_LOGIN=your-default-mt5-login
MT5_PASSWORD=your-default-mt5-password
MT5_SERVER=your-default-mt5-server
```

**Note**: These are default values. Users will connect their own MT5 accounts through the UI.

### 2. MT5 REST API Setup

To enable MT5 REST API:

1. Install MT5 terminal
2. Enable REST API in MT5 settings
3. Configure REST API port (default: 8080)
4. Ensure firewall allows connections to the REST API port

### 3. Database Models

The integration uses two MongoDB models:

- **MT5Account**: Stores user MT5 account connections and settings
- **MT5Trade**: Stores trade history and open positions

These models are automatically created when users connect their accounts.

## API Endpoints

### Authentication Required
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Account Management

#### Connect MT5 Account
```
POST /api/mt5/connect
Body: {
  mt5Login: number,
  mt5Password: string,
  mt5Server: string
}
```

#### Get Account Information
```
GET /api/mt5/account
```

#### Update Account Settings
```
PUT /api/mt5/account/settings
Body: {
  copyTradingEnabled: boolean,
  copyTradingSettings: {
    maxRiskPercent: number,
    multiplier: number,
    symbols: string[]
  }
}
```

### Market Data

#### Get Market Quotes
```
GET /api/mt5/quotes?symbols=EURUSD,GBPUSD
```

#### Get Available Symbols
```
GET /api/mt5/symbols
```

#### Get Historical Data
```
GET /api/mt5/history?symbol=EURUSD&timeframe=H1&from=2024-01-01&to=2024-01-31
```

### Trading

#### Place Order
```
POST /api/mt5/order
Body: {
  symbol: string,
  type: 'BUY' | 'SELL',
  volume: number,
  price?: number,
  stopLoss?: number,
  takeProfit?: number,
  slippage?: number,
  comment?: string
}
```

#### Close Position
```
POST /api/mt5/order/close
Body: {
  ticket: number,
  volume?: number
}
```

#### Get Open Positions
```
GET /api/mt5/positions
```

#### Get Trade History
```
GET /api/mt5/trades?status=closed&symbol=EURUSD&from=2024-01-01&to=2024-01-31
```

### Copy Trading

#### Execute Copy Trade from Signal
```
POST /api/mt5/copy-trade
Body: {
  signalId: string
}
```

## Frontend Usage

### Connect MT5 Account

1. Navigate to `/mt5` page
2. Click "Connect MT5 Account"
3. Enter your MT5 credentials:
   - MT5 Login (account number)
   - MT5 Password
   - MT5 Server name
4. Click "Connect"

### View Account Dashboard

The MT5 dashboard (`/mt5`) displays:
- Account balance and equity
- Free margin and margin level
- Trading statistics (win rate, profit factor)
- Open positions
- Copy trading status

### Copy Trade from Signals

1. Navigate to Dashboard or Signals page
2. Find a trading signal you want to copy
3. Click "Copy Trade" button
4. The system will:
   - Check if copy trading is enabled
   - Calculate position size based on risk settings
   - Execute the trade on your MT5 account
   - Link the trade to the original signal

### Configure Copy Trading Settings

1. Go to `/mt5` page
2. Click "Settings" button
3. Configure:
   - Enable/disable copy trading
   - Maximum risk per trade (%)
   - Volume multiplier
   - Allowed/excluded symbols

## Copy Trading Features

### Risk Management

- **Max Risk Per Trade**: Percentage of account balance to risk per trade
- **Volume Multiplier**: Multiply signal position size by this factor
- **Symbol Filtering**: Allow or exclude specific trading symbols
- **Daily Limits**: Maximum trades per day (configurable)

### Automatic Execution

When copy trading is enabled:
- Trades are automatically executed when you click "Copy Trade"
- Position size is calculated based on your risk settings
- Stop loss and take profit are set from the signal
- Trade is linked to the original signal for tracking

## Security Considerations

1. **Credentials Storage**: MT5 passwords are encrypted in the database
2. **Authentication**: All API calls require JWT authentication
3. **Account Verification**: MT5 accounts are verified before connection
4. **Trade Validation**: All trades are validated before execution
5. **Risk Limits**: Built-in risk management prevents excessive trading

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to MT5 account
- Verify MT5 terminal is running
- Check REST API is enabled in MT5 settings
- Verify firewall allows connections to REST API port
- Confirm credentials are correct

**Problem**: "MT5 account not found or not verified"
- Ensure account was successfully connected
- Try reconnecting the account
- Check MT5 terminal is accessible

### Trading Issues

**Problem**: "Copy trading is not enabled"
- Go to MT5 settings and enable copy trading
- Configure risk settings

**Problem**: "Daily trade limit reached"
- Check your risk settings
- Wait for the limit to reset (daily)

**Problem**: "Symbol is excluded from copy trading"
- Update copy trading settings to include the symbol
- Or remove it from excluded symbols list

## Integration with Signals

The MT5 integration seamlessly works with the existing trading signals system:

1. **Signal Creation**: Teachers create trading signals as usual
2. **Signal Display**: Signals are displayed with "Copy Trade" buttons
3. **Copy Execution**: Users click to copy trades automatically
4. **Trade Tracking**: Copied trades are linked to original signals
5. **Performance Analysis**: Track which signals performed best

## Future Enhancements

Potential future features:
- Automatic copy trading (copy all signals automatically)
- Advanced risk management (trailing stops, partial closes)
- Multi-account support
- Trade alerts and notifications
- Performance analytics and reporting
- Social trading features

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in the UI
3. Check server logs for detailed error information
4. Contact platform administrators

## Notes

- MT5 REST API must be running and accessible
- Users are responsible for their own trading decisions
- Past performance does not guarantee future results
- Always use proper risk management
- Test with demo accounts before using live accounts

