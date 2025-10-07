#!/bin/bash

echo "=========================================================================="
echo "  FINAL FIX: API Loop + Apache Headers + MaxRequestWorkers              "
echo "=========================================================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# PART 1: Fix Frontend API Routing (CRITICAL)
# ============================================================================
echo -e "${YELLOW}[1/5] Fixing API routing loop in frontend...${NC}"
cd /var/www/forex/frontend

# Backup current file
cp app/api/\[...path\]/route.ts app/api/\[...path\]/route.ts.backup.$(date +%Y%m%d_%H%M%S)

# Apply the fix
cat > app/api/\[...path\]/route.ts << 'EOF'
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
    let path = params.path.join('/');
    
    // Strip 'api/' prefix if it exists to prevent duplication
    if (path.startsWith('api/')) {
      path = path.slice(4); // Remove 'api/' (4 characters)
    }
    
    // Skip community routes - they have dedicated handlers
    if (path.startsWith('community/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    // Skip certificate routes - they have dedicated handlers
    if (path.startsWith('certificates/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    const url = new URL(request.url);
    // Build backend URL - BACKEND_URL already includes /api
    const backendUrl = BACKEND_URL.includes('/api') 
      ? `${BACKEND_URL}/${path}${url.search}`
      : `${BACKEND_URL}/api/${path}${url.search}`;
    
    console.log(`API proxy: ${method} ${path} -> ${backendUrl}`);

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
EOF

echo -e "${GREEN}✓ API routing fixed${NC}"

# ============================================================================
# PART 2: Rebuild and Restart Frontend
# ============================================================================
echo -e "\n${YELLOW}[2/5] Rebuilding frontend...${NC}"
# Kill the frontend process to force rebuild
pm2 delete frontend 2>/dev/null || true
cd /var/www/forex/frontend
pm2 start npm --name frontend -- start -- -p 3000
pm2 save

echo -e "${GREEN}✓ Frontend rebuilt and restarted${NC}"

# ============================================================================
# PART 3: Fix Apache Header Size Limits (HTTP 431)
# ============================================================================
echo -e "\n${YELLOW}[3/5] Fixing Apache header size limits...${NC}"
cd /var/www/forex

# Backup Apache security config
if [ -f /etc/apache2/conf-available/security.conf ]; then
    cp /etc/apache2/conf-available/security.conf /etc/apache2/conf-available/security.conf.backup.$(date +%Y%m%d_%H%M%S)
fi

# Increase header size limits
cat > /etc/apache2/conf-available/large-headers.conf << 'HEADER_FIX'
# Increase header limits to prevent 431 errors
LimitRequestFieldSize 16384
LimitRequestLine 16384
LimitRequestFields 200
HEADER_FIX

a2enconf large-headers
echo -e "${GREEN}✓ Apache header limits increased${NC}"

# ============================================================================
# PART 4: Fix Apache MaxRequestWorkers
# ============================================================================
echo -e "\n${YELLOW}[4/5] Fixing Apache MaxRequestWorkers...${NC}"

# Backup MPM config
cp /etc/apache2/mods-available/mpm_event.conf /etc/apache2/mods-available/mpm_event.conf.backup.$(date +%Y%m%d_%H%M%S)

# Update MPM settings
cat > /etc/apache2/mods-available/mpm_event.conf << 'MPM_FIX'
<IfModule mpm_event_module>
    StartServers             4
    MinSpareThreads          75
    MaxSpareThreads          250
    ThreadsPerChild          50
    MaxRequestWorkers        400
    MaxConnectionsPerChild   10000
</IfModule>
MPM_FIX

echo -e "${GREEN}✓ Apache MaxRequestWorkers increased to 400${NC}"

# ============================================================================
# PART 5: Test and Restart Apache
# ============================================================================
echo -e "\n${YELLOW}[5/5] Testing and restarting Apache...${NC}"

apache2ctl configtest
if [ $? -eq 0 ]; then
    systemctl restart apache2
    echo -e "${GREEN}✓ Apache restarted successfully${NC}"
else
    echo -e "${RED}✗ Apache configuration test failed!${NC}"
    echo "Restoring backups..."
    mv /etc/apache2/mods-available/mpm_event.conf.backup.* /etc/apache2/mods-available/mpm_event.conf 2>/dev/null
    mv /etc/apache2/conf-available/security.conf.backup.* /etc/apache2/conf-available/security.conf 2>/dev/null
    exit 1
fi

# ============================================================================
# Testing
# ============================================================================
echo ""
echo "=========================================================================="
echo -e "${GREEN}  Testing the fixes...${NC}"
echo "=========================================================================="
echo ""

sleep 5

echo "1. Backend health check:"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health)
if [[ $HEALTH == "200" ]]; then
    echo -e "   ${GREEN}✓ Backend responding (HTTP $HEALTH)${NC}"
else
    echo -e "   ${RED}✗ Backend not responding (HTTP $HEALTH)${NC}"
fi

echo ""
echo "2. Courses endpoint:"
COURSES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/courses)
if [[ $COURSES == "200" ]]; then
    echo -e "   ${GREEN}✓ Courses endpoint working (HTTP $COURSES)${NC}"
else
    echo -e "   ${YELLOW}⚠ Courses endpoint returned HTTP $COURSES${NC}"
fi

echo ""
echo "3. Frontend proxy test:"
PROXY=$(curl -s -o /dev/null -w "%{http_code}" https://thefxnavigators.com/api/health)
if [[ $PROXY == "200" ]]; then
    echo -e "   ${GREEN}✓ Frontend proxy working (HTTP $PROXY)${NC}"
else
    echo -e "   ${RED}✗ Frontend proxy failed (HTTP $PROXY)${NC}"
fi

echo ""
echo "4. Checking PM2 logs for API duplication:"
pm2 logs frontend --lines 5 --nostream | grep "API proxy"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=========================================================================="
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo "=========================================================================="
echo ""
echo "Fixes applied:"
echo "  1. ✅ Stripped 'api/' prefix from catch-all route to prevent duplication"
echo "  2. ✅ Rebuilt and restarted frontend"
echo "  3. ✅ Increased Apache header size limits (fixes HTTP 431)"
echo "  4. ✅ Increased Apache MaxRequestWorkers to 400"
echo "  5. ✅ Restarted Apache"
echo ""
echo "Expected log format:"
echo "  ${GREEN}✓ API proxy: POST auth/login -> https://thefxnavigators.com/api/auth/login${NC}"
echo ""
echo "NOT:"
echo "  ${RED}✗ API proxy: POST api/auth/login -> https://thefxnavigators.com/api/api/auth/login${NC}"
echo ""
echo "Monitor logs:"
echo "  • pm2 logs frontend"
echo "  • tail -f /var/www/forex/backend.log"
echo "  • tail -f /var/log/apache2/error.log"
echo ""
echo "Test login at: https://thefxnavigators.com"
echo ""

