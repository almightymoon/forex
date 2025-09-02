#!/bin/bash

# Script to fix admin API configuration on the server

echo "🔧 Fixing admin API configuration..."

# Create .env.local file with correct API URL
cat > /var/www/forex/frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:9090
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_ENABLE_DEBUG=false
EOF

echo "✅ Created .env.local file"

# Rebuild frontend
cd /var/www/forex/frontend
npm run build

echo "✅ Frontend rebuilt"

# Restart frontend process
pm2 restart 18

echo "✅ Frontend restarted"

# Check if backend is running on correct port
echo "🔍 Checking backend status..."
curl -s http://127.0.0.1:9090/api/health

echo "✅ Configuration complete!"
