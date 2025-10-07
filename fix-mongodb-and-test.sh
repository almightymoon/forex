#!/bin/bash

echo "=========================================================================="
echo "  MongoDB Connection Fix & Endpoint Testing"
echo "=========================================================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find and start MongoDB
echo -e "${YELLOW}[1/5] Finding and starting MongoDB...${NC}"

# Try different service names
if systemctl list-units --all | grep -q "mongodb.service"; then
    echo "Found: mongodb.service"
    systemctl start mongodb
    systemctl status mongodb | grep Active
elif systemctl list-units --all | grep -q "mongod.service"; then
    echo "Found: mongod.service"
    systemctl start mongod
    systemctl status mongod | grep Active
else
    echo -e "${YELLOW}⚠ MongoDB service not found via systemctl${NC}"
    echo "Checking if MongoDB is already running..."
fi

# Test MongoDB connection
echo -e "\n${YELLOW}[2/5] Testing MongoDB connection...${NC}"
if command -v mongo &> /dev/null; then
    mongo --eval "db.adminCommand('ping')" --quiet && echo -e "${GREEN}✓ MongoDB connected (mongo)${NC}"
elif command -v mongosh &> /dev/null; then
    mongosh --eval "db.adminCommand('ping')" --quiet && echo -e "${GREEN}✓ MongoDB connected (mongosh)${NC}"
else
    echo -e "${RED}✗ No MongoDB client found${NC}"
fi

# Check if MongoDB is listening
echo -e "\n${YELLOW}[3/5] Checking MongoDB port...${NC}"
if netstat -tuln | grep -q ":27017"; then
    echo -e "${GREEN}✓ MongoDB is listening on port 27017${NC}"
else
    echo -e "${RED}✗ MongoDB is NOT listening on port 27017${NC}"
fi

# Test backend endpoints
echo -e "\n${YELLOW}[4/5] Testing backend endpoints...${NC}"

echo "• GET /api/health:"
curl -s -w "\n  HTTP Status: %{http_code}\n" http://localhost:4000/api/health
echo ""

echo "• GET /api/courses:"
COURSES_RESPONSE=$(curl -s -w "\n  HTTP Status: %{http_code}\n" http://localhost:4000/api/courses 2>&1)
echo "$COURSES_RESPONSE"
echo ""

echo "• POST /api/auth/login (test credentials):"
LOGIN_RESPONSE=$(curl -s -w "\n  HTTP Status: %{http_code}\n" -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}' 2>&1)
echo "$LOGIN_RESPONSE"
echo ""

# Check backend logs for errors
echo -e "\n${YELLOW}[5/5] Checking backend logs for errors...${NC}"
echo "=== Last 30 lines of backend logs ==="
pm2 logs backend --lines 30 --nostream | tail -30

echo ""
echo "=== Searching for MongoDB connection errors ==="
pm2 logs backend --lines 100 --nostream | grep -i "mongo\|connection\|econnrefused\|error" | tail -20

echo ""
echo "=========================================================================="
echo -e "${YELLOW}  DIAGNOSIS COMPLETE${NC}"
echo "=========================================================================="
echo ""
echo "To see live backend logs, run:"
echo "  pm2 logs backend"
echo ""

