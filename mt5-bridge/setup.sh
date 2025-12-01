#!/bin/bash

# MT5 Bridge Setup Script for Production
# This script sets up the MT5 bridge on the server

set -e

echo "Setting up MT5 Bridge..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# Navigate to mt5-bridge directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
PORT=8080
HOST=0.0.0.0
DEBUG=False
EOF
    echo "Please edit .env file with your configuration"
fi

# Create logs directory
mkdir -p logs

echo "MT5 Bridge setup complete!"
echo ""
echo "To start the bridge:"
echo "  source venv/bin/activate"
echo "  python app.py"
echo ""
echo "Or with PM2:"
echo "  pm2 start app.py --name mt5-bridge --interpreter venv/bin/python3"
echo "  pm2 save"

