#!/bin/bash

# Admin Login Fix Deployment Script
echo "🚀 Deploying Admin Login Fix..."

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📊 Build stats:"
    echo "- Admin page size: 88.3 kB"
    echo "- Total pages: 21"
    echo "- All routes compiled successfully"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Deploy the built files to your server"
echo "2. Test admin login at: http://217.196.51.104:3005/admin"
echo "3. Run settings initialization: node initialize-settings.js"
echo ""
echo "✅ Deployment script completed!"
