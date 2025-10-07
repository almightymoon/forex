#!/bin/bash

# Production Backend Fix Script
# Run this on your production server: root@srv1030072

echo "=== Starting Production Backend Fix ==="

# Navigate to backend directory
cd /var/www/forex

# Step 1: Stop any running backend processes
echo -e "\n[1/8] Stopping existing backend processes..."
pkill -f "node server.js" || echo "No existing process found"
pm2 stop all 2>/dev/null || echo "PM2 not managing processes"

# Step 2: Check if .env file exists
echo -e "\n[2/8] Checking environment configuration..."
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Creating .env from template..."
    
    if [ -f env.production.template ]; then
        cp env.production.template .env
        echo "Please edit /var/www/forex/.env with your actual credentials"
    fi
fi

# Step 3: Check MongoDB connection
echo -e "\n[3/8] Checking MongoDB connection..."
mongo --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ MongoDB is running"
else
    echo "⚠ MongoDB might not be running. Starting MongoDB..."
    systemctl start mongod || service mongod start || echo "Please start MongoDB manually"
fi

# Step 4: Install/update dependencies
echo -e "\n[4/8] Checking dependencies..."
if [ -f package.json ]; then
    echo "Installing/updating npm packages..."
    npm install --production 2>&1 | tail -5
fi

# Step 5: Check if uploads directory exists
echo -e "\n[5/8] Checking uploads directory..."
mkdir -p uploads/teacher-certificates
chmod -R 755 uploads
chown -R www-data:www-data uploads 2>/dev/null || chown -R $(whoami):$(whoami) uploads
echo "✓ Uploads directory ready"

# Step 6: Test if server can start
echo -e "\n[6/8] Testing server startup..."
timeout 10 node -e "
const mongoose = require('mongoose');
const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
mongoose.connect(dbUri)
  .then(() => { console.log('✓ Database connection successful'); process.exit(0); })
  .catch(err => { console.error('✗ Database connection failed:', err.message); process.exit(1); });
" 2>&1

# Step 7: Start backend server with PM2 or as background process
echo -e "\n[7/8] Starting backend server..."

# Try PM2 first
if command -v pm2 &> /dev/null; then
    pm2 start server.js --name forex-backend --log /var/www/forex/backend.log --time
    pm2 save
    echo "✓ Backend started with PM2"
else
    # Fallback to nohup
    echo "PM2 not found, using nohup..."
    nohup node server.js > backend.log 2>&1 &
    echo $! > backend.pid
    echo "✓ Backend started with nohup (PID: $(cat backend.pid))"
fi

sleep 3

# Step 8: Test backend health
echo -e "\n[8/8] Testing backend health..."
curl -s http://localhost:4000/api/health | head -20

if [ $? -eq 0 ]; then
    echo -e "\n✅ Backend is responding!"
else
    echo -e "\n❌ Backend is not responding on port 4000"
    echo "Checking what's on port 4000..."
    lsof -i :4000 || netstat -tulpn | grep :4000
fi

# Check recent logs
echo -e "\n=== Recent Backend Logs ==="
tail -20 backend.log

echo -e "\n=== Fix script completed ==="
echo "If backend is still not working, check:"
echo "1. /var/www/forex/.env has correct MongoDB URI"
echo "2. /var/www/forex/backend.log for detailed errors"
echo "3. Apache proxy configuration in /etc/apache2/sites-enabled/"

