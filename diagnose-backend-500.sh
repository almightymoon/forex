#!/bin/bash

echo "=========================================================================="
echo "  Backend 500 Error Diagnosis"
echo "=========================================================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check 1: Backend process status
echo -e "${YELLOW}[1/8] Checking if backend is running...${NC}"
if pm2 list | grep -q "backend.*online"; then
    echo -e "${GREEN}✓ Backend process is running${NC}"
    pm2 describe backend | grep -E "status|uptime|restart"
else
    echo -e "${RED}✗ Backend is NOT running!${NC}"
    echo "Starting backend..."
    cd /var/www/forex
    pm2 start server.js --name backend
fi

# Check 2: MongoDB status
echo -e "\n${YELLOW}[2/8] Checking MongoDB...${NC}"
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}✗ MongoDB is NOT running!${NC}"
    echo "Starting MongoDB..."
    systemctl start mongod
    sleep 2
fi

# Check 3: Test MongoDB connection
echo -e "\n${YELLOW}[3/8] Testing MongoDB connection...${NC}"
mongo --eval "db.adminCommand('ping')" --quiet 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ MongoDB connection successful${NC}"
else
    echo -e "${RED}✗ MongoDB connection failed${NC}"
    echo "Trying mongosh..."
    mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null
fi

# Check 4: Check backend environment variables
echo -e "\n${YELLOW}[4/8] Checking backend .env file...${NC}"
cd /var/www/forex
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    echo "Key variables:"
    grep -E "^(MONGO_URI|JWT_SECRET|PORT)" .env | sed 's/=.*/=***/'
else
    echo -e "${RED}✗ .env file NOT FOUND!${NC}"
fi

# Check 5: Backend logs
echo -e "\n${YELLOW}[5/8] Recent backend errors (last 50 lines)...${NC}"
if [ -f /var/www/forex/backend.log ]; then
    echo "----------------------------------------"
    tail -50 /var/www/forex/backend.log | grep -i "error\|exception\|failed\|refused" || echo "No errors found in logs"
    echo "----------------------------------------"
else
    echo -e "${YELLOW}⚠ No backend.log file found${NC}"
fi

# Check 6: PM2 backend logs
echo -e "\n${YELLOW}[6/8] PM2 backend logs (last 20 lines)...${NC}"
echo "=== PM2 Output Logs ==="
pm2 logs backend --lines 20 --nostream 2>/dev/null | tail -20
echo ""
echo "=== PM2 Error Logs ==="
pm2 logs backend --err --lines 20 --nostream 2>/dev/null | tail -20

# Check 7: Test backend health directly
echo -e "\n${YELLOW}[7/8] Testing backend directly...${NC}"
HEALTH=$(curl -s -o /tmp/health-response.txt -w "%{http_code}" http://localhost:4000/api/health)
echo "Response code: $HEALTH"
if [ -f /tmp/health-response.txt ]; then
    echo "Response body:"
    cat /tmp/health-response.txt
    echo ""
fi

# Check 8: Test specific endpoints
echo -e "\n${YELLOW}[8/8] Testing problematic endpoints...${NC}"

echo "• Testing GET /api/courses:"
COURSES=$(curl -s -o /tmp/courses-response.txt -w "%{http_code}" http://localhost:4000/api/courses)
echo "  Status: $COURSES"
if [ "$COURSES" != "200" ] && [ -f /tmp/courses-response.txt ]; then
    echo "  Error response:"
    cat /tmp/courses-response.txt | head -20
    echo ""
fi

echo ""
echo "• Testing POST /api/auth/login:"
LOGIN=$(curl -s -o /tmp/login-response.txt -w "%{http_code}" -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123"}')
echo "  Status: $LOGIN"
if [ -f /tmp/login-response.txt ]; then
    echo "  Error response:"
    cat /tmp/login-response.txt | head -20
    echo ""
fi

# Summary
echo ""
echo "=========================================================================="
echo -e "${YELLOW}  DIAGNOSIS SUMMARY${NC}"
echo "=========================================================================="
echo ""

# Determine root cause
if ! pm2 list | grep -q "backend.*online"; then
    echo -e "${RED}ROOT CAUSE: Backend is not running${NC}"
    echo "Solution: pm2 restart backend"
elif ! systemctl is-active --quiet mongod; then
    echo -e "${RED}ROOT CAUSE: MongoDB is not running${NC}"
    echo "Solution: systemctl start mongod"
elif [ "$HEALTH" != "200" ]; then
    echo -e "${RED}ROOT CAUSE: Backend not responding to health check${NC}"
    echo "Check backend logs above for errors"
    echo "Solution: pm2 restart backend && pm2 logs backend"
else
    echo -e "${YELLOW}Backend health check passed, but endpoints failing${NC}"
    echo "Check the endpoint error responses above"
    echo "Possible causes:"
    echo "  • Database connection issues"
    echo "  • Missing/invalid JWT_SECRET"
    echo "  • Missing database collections"
    echo "  • Code errors in route handlers"
fi

echo ""
echo "Next steps:"
echo "  1. Review errors above"
echo "  2. Check: pm2 logs backend --lines 100"
echo "  3. Restart: pm2 restart backend"
echo "  4. Monitor: pm2 monit"
echo ""

