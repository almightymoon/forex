# Installing MetaTrader5 on Linux Server

The MetaTrader5 Python package requires the MT5 terminal to be installed on the server. Here's how to set it up:

## Option 1: Install MT5 Terminal via Wine (Recommended for Linux)

### Step 1: Install Wine
```bash
sudo apt-get update
sudo apt-get install -y wine64
```

### Step 2: Download and Install MT5 Terminal
1. Download MT5 terminal installer for Windows
2. Install via Wine:
```bash
wine mt5setup.exe
```

### Step 3: Install MetaTrader5 Python Package
```bash
cd mt5-bridge
source venv/bin/activate
pip install MetaTrader5
```

## Option 2: Use Windows Server

If you have a Windows server, simply:
1. Install MT5 terminal normally
2. Install Python and the MetaTrader5 package

## Option 3: Run Bridge on Separate Windows Machine

Run the MT5 bridge on a Windows machine with MT5 installed, and point your Node.js backend to that machine's IP address.

## Current Status

The bridge will run without MT5 installed, but MT5 operations will return errors. The bridge will:
- ✅ Start successfully
- ✅ Respond to health checks
- ❌ Fail MT5 authentication attempts
- ❌ Fail MT5 trading operations

## Testing Without MT5

You can test the bridge endpoints, but they will return appropriate error messages indicating MT5 is not available.

