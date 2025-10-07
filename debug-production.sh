#!/bin/bash

# Production Backend Debug Script
# Run this on your production server: root@srv1030072

echo "=== Checking if backend is running ==="
ps aux | grep node | grep -v grep

echo -e "\n=== Checking backend logs ==="
tail -100 /var/www/forex/backend.log

echo -e "\n=== Checking backend .env file exists ==="
ls -la /var/www/forex/.env

echo -e "\n=== Testing MongoDB connection ==="
mongosh --eval "db.adminCommand('ping')" 2>&1 | head -10

echo -e "\n=== Checking PM2 status (if using PM2) ==="
pm2 list

echo -e "\n=== Checking Node process ==="
cd /var/www/forex
node -e "console.log('Node version:', process.version)"

echo -e "\n=== Testing backend server directly ==="
curl -s http://localhost:4000/api/health | head -20

echo -e "\n=== Checking Apache proxy configuration ==="
cat /etc/apache2/sites-enabled/*.conf | grep -A 5 ProxyPass

echo -e "\n=== Recent Apache error logs ==="
tail -50 /var/log/apache2/error.log

