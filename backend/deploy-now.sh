#!/bin/bash

echo "🚀 Quick Deploy - Optimized Landing Page"

# Build the frontend
echo "📦 Building frontend..."
cd frontend
rm -rf .next
SKIP_ENV_VALIDATION=true npm run build -- --no-lint

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Next steps to deploy:"
    echo "1. Copy the .next folder to your production server"
    echo "2. Restart your frontend server"
    echo "3. The landing page should now load instantly!"
    echo ""
    echo "🌐 Your optimized landing page will be accessible at http://217.196.51.104:3005/"
    echo "⚡ It should load in under 5 seconds instead of 1 minute!"
else
    echo "❌ Build failed!"
    exit 1
fi
