#!/bin/bash

echo "🚀 Deploying optimized frontend..."

# Build the frontend
echo "📦 Building frontend..."
cd frontend
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Copy build files to production directory (adjust path as needed)
    echo "📁 Copying build files..."
    sudo cp -r .next /var/www/html/frontend/.next
    sudo cp -r public /var/www/html/frontend/public
    sudo cp package.json /var/www/html/frontend/
    sudo cp next.config.js /var/www/html/frontend/
    sudo cp -r lib /var/www/html/frontend/
    sudo cp -r app /var/www/html/frontend/
    
    echo "✅ Frontend deployed successfully!"
    echo "🌐 Your frontend should now be accessible at http://217.196.51.104:9000"
    echo "🔧 API calls will now route to http://217.196.51.104:9090"
else
    echo "❌ Build failed!"
    exit 1
fi
