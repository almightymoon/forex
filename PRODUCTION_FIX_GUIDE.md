# Production Backend Fix Guide

## Current Issue
The production backend at `https://thefxnavigators.com/api` is returning 500 Internal Server Errors for:
- `GET /api/courses`
- `POST /api/auth/login`
- Settings endpoint

## Quick Fix Steps

### Step 1: SSH into Production Server
```bash
ssh root@srv1030072
```

### Step 2: Navigate to Backend Directory
```bash
cd /var/www/forex
```

### Step 3: Check Backend Status
```bash
# Check if backend is running
ps aux | grep "node server.js" | grep -v grep

# Check recent logs
tail -50 backend.log

# Check PM2 status (if using PM2)
pm2 list
pm2 logs forex-backend --lines 50
```

### Step 4: Check MongoDB Connection
```bash
# Test MongoDB connection
mongo --eval "db.runCommand({ ping: 1 })"

# If MongoDB is not running:
systemctl start mongod
# OR
service mongod start
```

### Step 5: Check Environment Variables
```bash
# Verify .env file exists
ls -la .env

# Check key variables (without showing sensitive data)
cat .env | grep -E "MONGO|JWT_SECRET|PORT" | sed 's/=.*/=***/'
```

### Step 6: Restart Backend Server

#### If using PM2:
```bash
cd /var/www/forex
pm2 stop forex-backend
pm2 delete forex-backend
pm2 start server.js --name forex-backend --log backend.log --time
pm2 save
```

#### If using direct Node process:
```bash
# Stop existing process
pkill -f "node server.js"

# Start new process
nohup node server.js > backend.log 2>&1 &
echo $! > backend.pid
```

### Step 7: Verify Backend is Working
```bash
# Test health endpoint
curl http://localhost:4000/api/health

# Test courses endpoint
curl http://localhost:4000/api/courses

# Check if backend is listening on port 4000
netstat -tulpn | grep :4000
# OR
lsof -i :4000
```

### Step 8: Check Apache Proxy Configuration
```bash
# Verify Apache is proxying correctly
cat /etc/apache2/sites-enabled/*.conf | grep -A 10 ProxyPass

# Restart Apache if needed
systemctl restart apache2
```

## Common Issues and Solutions

### Issue 1: MongoDB Not Connected
**Symptoms:** Backend logs show "MongoDB connection error"

**Solution:**
```bash
# Check MongoDB status
systemctl status mongod

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Verify connection
mongo --eval "db.runCommand({ ping: 1 })"
```

### Issue 2: Missing Dependencies
**Symptoms:** Backend logs show "Cannot find module 'xxx'"

**Solution:**
```bash
cd /var/www/forex
npm install --production
```

### Issue 3: Port 4000 Already in Use
**Symptoms:** Backend logs show "EADDRINUSE: address already in use :::4000"

**Solution:**
```bash
# Find and kill the process using port 4000
lsof -ti:4000 | xargs kill -9

# Or identify the process
lsof -i :4000

# Then restart backend
```

### Issue 4: Permission Issues
**Symptoms:** Cannot write to log files or upload directories

**Solution:**
```bash
cd /var/www/forex

# Fix ownership
chown -R www-data:www-data .

# Or if www-data doesn't exist
chown -R $(whoami):$(whoami) .

# Fix permissions
chmod -R 755 uploads
chmod 644 .env
```

### Issue 5: JWT_SECRET or Environment Variables Not Set
**Symptoms:** Backend logs show "JWT_SECRET not set" or authentication errors

**Solution:**
```bash
cd /var/www/forex

# Check if .env exists
if [ ! -f .env ]; then
    # Copy from template
    cp env.production.template .env
    nano .env  # Edit with correct values
fi

# Verify critical variables
grep "JWT_SECRET" .env
grep "MONGO_URI" .env
```

## Automated Fix Script

Run the automated fix script:
```bash
cd /var/www/forex
chmod +x fix-production-backend.sh
./fix-production-backend.sh
```

## Manual Verification Checklist

- [ ] MongoDB is running: `systemctl status mongod`
- [ ] Backend process is running: `ps aux | grep "node server.js"`
- [ ] Backend responds locally: `curl http://localhost:4000/api/health`
- [ ] Apache is proxying correctly: Port 80/443 → Port 4000
- [ ] .env file has all required variables
- [ ] uploads directory has correct permissions
- [ ] No errors in backend.log: `tail -50 backend.log`
- [ ] No errors in Apache logs: `tail -50 /var/log/apache2/error.log`

## Testing After Fix

### Test Backend Directly
```bash
# From production server
curl http://localhost:4000/api/health
curl http://localhost:4000/api/courses
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Through Apache
```bash
# From production server
curl https://thefxnavigators.com/api/health
curl https://thefxnavigators.com/api/courses
```

### Test From Browser
1. Open: https://thefxnavigators.com/api/health
2. Should see: `{"status":"OK","timestamp":"...","uptime":...}`

## If Problem Persists

1. **Enable detailed logging:**
   ```bash
   cd /var/www/forex
   # Edit server.js to add more console.log statements
   # Or set NODE_ENV to development temporarily
   ```

2. **Check all logs:**
   ```bash
   tail -100 /var/www/forex/backend.log
   tail -100 /var/log/apache2/error.log
   tail -100 /var/log/apache2/access.log
   journalctl -u apache2 -n 50
   ```

3. **Test database directly:**
   ```bash
   mongo forex-lms --eval "db.users.countDocuments()"
   mongo forex-lms --eval "db.courses.countDocuments()"
   mongo forex-lms --eval "db.settings.find().pretty()"
   ```

4. **Restart everything:**
   ```bash
   systemctl restart mongod
   pm2 restart all
   systemctl restart apache2
   ```

## Contact Information
If issues persist, provide:
- Contents of `backend.log` (last 100 lines)
- Contents of `/var/log/apache2/error.log` (last 50 lines)
- Output of `ps aux | grep node`
- Output of `systemctl status mongod`
- Output of `curl http://localhost:4000/api/health`

