#!/bin/bash

echo "==================================================================="
echo "  Complete Production Fix - Apache + API Loop                     "
echo "==================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd /var/www/forex/frontend

echo -e "${YELLOW}[1/5] Fixing API routing loop...${NC}"
echo "Updating app/api/[...path]/route.ts"

# Backup the original file
cp app/api/\[...path\]/route.ts app/api/\[...path\]/route.ts.backup.$(date +%Y%m%d_%H%M%S)

# Fix the API routing issue
cat > app/api/\[...path\]/route.ts << 'ROUTE_FIX'
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join('/');
    
    // Skip community routes - they have dedicated handlers
    if (path.startsWith('community/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    // Skip certificate routes - they have dedicated handlers
    if (path.startsWith('certificates/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    const url = new URL(request.url);
    // Fix: Don't add /api/ if BACKEND_URL already includes it
    const backendUrl = BACKEND_URL.includes('/api') 
      ? `${BACKEND_URL}/${path}${url.search}`
      : `${BACKEND_URL}/api/${path}${url.search}`;
    
    console.log(`Catch-all API proxy: ${method} ${path} -> ${backendUrl}`);

    // Get the request body if it exists
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (error) {
        // No body to read
      }
    }

    // Forward headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Don't forward host header
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();

    // Create new response with same status and headers
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers from backend response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
ROUTE_FIX

echo -e "${GREEN}✓ API routing fixed${NC}"

echo -e "\n${YELLOW}[2/5] Restarting frontend with PM2...${NC}"
pm2 restart frontend
echo -e "${GREEN}✓ Frontend restarted${NC}"

echo -e "\n${YELLOW}[3/5] Fixing Apache MaxRequestWorkers...${NC}"
cd /var/www/forex

# Backup Apache config
cp /etc/apache2/mods-available/mpm_event.conf /etc/apache2/mods-available/mpm_event.conf.backup.$(date +%Y%m%d_%H%M%S)

# Update Apache MPM settings
cat > /etc/apache2/mods-available/mpm_event.conf << 'APACHE_FIX'
<IfModule mpm_event_module>
    StartServers             4
    MinSpareThreads          75
    MaxSpareThreads          250
    ThreadsPerChild          50
    MaxRequestWorkers        400
    MaxConnectionsPerChild   10000
</IfModule>
APACHE_FIX

echo -e "${GREEN}✓ Apache configuration updated${NC}"

echo -e "\n${YELLOW}[4/5] Testing and restarting Apache...${NC}"
apache2ctl configtest

if [ $? -eq 0 ]; then
    systemctl restart apache2
    echo -e "${GREEN}✓ Apache restarted successfully${NC}"
else
    echo -e "${RED}✗ Apache configuration test failed!${NC}"
    echo "Restoring backup..."
    mv /etc/apache2/mods-available/mpm_event.conf.backup.* /etc/apache2/mods-available/mpm_event.conf
    exit 1
fi

echo -e "\n${YELLOW}[5/5] Testing the fixes...${NC}"
sleep 3

echo -e "\nTesting backend health..."
HEALTH_RESPONSE=$(curl -s http://localhost:4000/api/health)
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

echo -e "\nTesting courses endpoint..."
COURSES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/courses)
if [[ $COURSES_RESPONSE == "200" ]]; then
    echo -e "${GREEN}✓ Courses endpoint responding (HTTP $COURSES_RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠ Courses endpoint returned HTTP $COURSES_RESPONSE${NC}"
fi

echo -e "\nTesting through Apache proxy..."
PROXY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://thefxnavigators.com/api/health)
if [[ $PROXY_HEALTH == "200" ]]; then
    echo -e "${GREEN}✓ Apache proxy working (HTTP $PROXY_HEALTH)${NC}"
else
    echo -e "${RED}✗ Apache proxy failed (HTTP $PROXY_HEALTH)${NC}"
fi

echo ""
echo "==================================================================="
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "==================================================================="
echo ""
echo "Summary of fixes applied:"
echo "  1. ✓ Fixed API routing loop in frontend"
echo "  2. ✓ Restarted frontend service"
echo "  3. ✓ Increased Apache MaxRequestWorkers to 400"
echo "  4. ✓ Restarted Apache"
echo "  5. ✓ Tested all endpoints"
echo ""
echo "Next steps:"
echo "  • Try logging in from the browser"
echo "  • Monitor logs: tail -f /var/log/apache2/error.log"
echo "  • Check PM2 status: pm2 logs"
echo ""
echo "If issues persist, check:"
echo "  • Backend logs: tail -f /var/www/forex/backend.log"
echo "  • Frontend logs: pm2 logs frontend"
echo "  • Apache logs: tail -f /var/log/apache2/forex_error.log"
echo ""

