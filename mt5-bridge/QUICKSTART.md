# MT5 Bridge Quick Start Guide

## Step 1: Install Dependencies

```bash
cd mt5-bridge
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 2: Create .env File

Create a `.env` file in the `mt5-bridge` folder:

```env
PORT=8080
HOST=0.0.0.0
DEBUG=False
```

## Step 3: Start MT5 Terminal

1. Install MetaTrader 5 terminal
2. Open MT5 terminal
3. Login to your MT5 account (demo or live)

## Step 4: Start the Bridge

```bash
python app.py
```

Or use the startup script:
```bash
chmod +x start.sh
./start.sh
```

The bridge will start on `http://localhost:8080`

## Step 5: Test the Bridge

```bash
# Health check
curl http://localhost:8080/health

# Test authentication (replace with your MT5 credentials)
curl -X POST http://localhost:8080/auth \
  -H "Content-Type: application/json" \
  -d '{
    "login": 12345678,
    "password": "your_password",
    "server": "YourBroker-Demo"
  }'
```

## Step 6: Update Node.js Backend

In your main project `.env` file, add:

```env
MT5_API_URL=http://localhost:8080
```

## Step 7: Test from Node.js Backend

1. Start your Node.js backend: `npm run dev`
2. Navigate to `/mt5` page
3. Click "Connect MT5 Account"
4. Enter your MT5 credentials
5. Test copy trading from signals

## Troubleshooting

- **MT5 not found**: Ensure MT5 terminal is installed and running
- **Connection failed**: Check MT5 credentials and server name
- **Port in use**: Change PORT in `.env` file
- **Import errors**: Activate virtual environment and reinstall requirements

## Next Steps

- Read `README.md` for full API documentation
- Test all endpoints
- Configure for production deployment
- Set up proper security measures

