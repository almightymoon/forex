#!/bin/bash

echo "🚀 Deploying optimized frontend..."

# Clean build cache and build the frontend
echo "🧹 Cleaning build cache..."
cd frontend
rm -rf .next

echo "📦 Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo "📁 Frontend is ready for deployment!"
    echo ""
    echo "🌐 Your frontend should be accessible at http://217.196.51.104:9000"
    echo "🔧 API calls will now route to http://217.196.51.104:9090"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the built files to your production server"
    echo "2. Restart your frontend server"
    echo "3. Test the course creation functionality"
else
    echo "❌ Build failed!"
    exit 1
fi
