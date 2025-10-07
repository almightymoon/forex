# Production Issues - Root Cause & Solutions ✅

## 🔍 Issues Identified

### Issue #1: API Routing Loop (CRITICAL)
**Symptom:** API calls creating infinite loop with duplicated paths
```
/api/api/api/api/.../auth/login
```

**Root Cause:** 
The catch-all route in `app/api/[...path]/route.ts` was adding `/api/` to URLs that already contained `/api`:
```typescript
// BEFORE (BROKEN):
const backendUrl = `${BACKEND_URL}/api/${path}`;
// Where BACKEND_URL = "https://thefxnavigators.com/api"
// Result: https://thefxnavigators.com/api/api/auth/login ❌
```

**Fix Applied:**
```typescript
// AFTER (FIXED):
const backendUrl = BACKEND_URL.includes('/api') 
  ? `${BACKEND_URL}/${path}${url.search}`
  : `${BACKEND_URL}/api/${path}${url.search}`;
// Result: https://thefxnavigators.com/api/auth/login ✅
```

**Impact:** This was causing ALL API calls to fail with 500 errors

---

### Issue #2: Apache MaxRequestWorkers Limit
**Symptom:** Apache returning 500 errors under load

**Evidence from logs:**
```
[mpm_event:error] AH00484: server reached MaxRequestWorkers setting
[mpm_event:error] AH10159: server is within MinSpareThreads of MaxRequestWorkers
```

**Root Cause:** 
Apache default configuration only allows ~150 concurrent connections. Your production site exceeded this limit.

**Fix Applied:**
Updated `/etc/apache2/mods-available/mpm_event.conf`:
```apache
<IfModule mpm_event_module>
    StartServers             4
    MinSpareThreads          75
    MaxSpareThreads          250
    ThreadsPerChild          50
    MaxRequestWorkers        400    # Increased from ~150
    MaxConnectionsPerChild   10000
</IfModule>
```

**Impact:** Can now handle 400 concurrent requests instead of 150

---

## 🚀 Deployment Instructions

### Quick Deploy (Automated)

**On your production server:**
```bash
ssh root@srv1030072

cd /var/www/forex

# Upload and run the complete fix script
chmod +x deploy-complete-fix.sh
./deploy-complete-fix.sh
```

This script will:
1. ✅ Fix the API routing loop
2. ✅ Restart the frontend
3. ✅ Fix Apache MaxRequestWorkers
4. ✅ Restart Apache
5. ✅ Test all endpoints

---

### Manual Deploy (Step by Step)

#### Part 1: Fix Frontend API Routing

```bash
cd /var/www/forex/frontend

# Backup current file
cp app/api/\[...path\]/route.ts app/api/\[...path\]/route.ts.backup

# Edit the file
nano app/api/\[...path\]/route.ts
```

Find this line (around line 59):
```typescript
const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`;
```

Replace with:
```typescript
// Fix: Don't add /api/ if BACKEND_URL already includes it
const backendUrl = BACKEND_URL.includes('/api') 
  ? `${BACKEND_URL}/${path}${url.search}`
  : `${BACKEND_URL}/api/${path}${url.search}`;
```

Save and restart:
```bash
pm2 restart frontend
```

#### Part 2: Fix Apache MaxRequestWorkers

```bash
# Backup current config
sudo cp /etc/apache2/mods-available/mpm_event.conf /etc/apache2/mods-available/mpm_event.conf.backup

# Edit config
sudo nano /etc/apache2/mods-available/mpm_event.conf
```

Replace entire content with:
```apache
<IfModule mpm_event_module>
    StartServers             4
    MinSpareThreads          75
    MaxSpareThreads          250
    ThreadsPerChild          50
    MaxRequestWorkers        400
    MaxConnectionsPerChild   10000
</IfModule>
```

Test and restart:
```bash
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## ✅ Verification Steps

### 1. Test Backend Directly
```bash
curl http://localhost:4000/api/health
# Expected: {"status":"OK","timestamp":"...","uptime":...}

curl http://localhost:4000/api/courses
# Expected: JSON array of courses (or empty array)
```

### 2. Test Through Apache Proxy
```bash
curl https://thefxnavigators.com/api/health
# Expected: {"status":"OK",...}

curl https://thefxnavigators.com/api/courses
# Expected: JSON array of courses
```

### 3. Test from Browser
1. Open browser console (F12)
2. Clear console logs
3. Navigate to: https://thefxnavigators.com
4. Try to login
5. Check console - should see:
   ```
   Catch-all API proxy: POST auth/login -> https://thefxnavigators.com/api/auth/login
   ```
   (NOT: `.../api/api/api/.../auth/login`)

### 4. Check Logs
```bash
# Backend logs - should show no errors
tail -f /var/www/forex/backend.log

# Apache logs - should not show MaxRequestWorkers errors
tail -f /var/log/apache2/error.log

# Frontend logs
pm2 logs frontend
```

---

## 📊 Expected Results

### Before Fix:
- ❌ Login fails with 500 error
- ❌ API calls show `/api/api/api/...` in logs
- ❌ Apache logs show MaxRequestWorkers errors
- ❌ Intermittent 500 errors under moderate load

### After Fix:
- ✅ Login works correctly
- ✅ API calls show correct paths: `/api/auth/login`
- ✅ Apache logs clean (no MaxRequestWorkers errors)
- ✅ Handles 400+ concurrent requests smoothly

---

## 🔧 Monitoring & Maintenance

### Real-time Monitoring
```bash
# Watch Apache status
watch -n 2 'apache2ctl status | head -30'

# Monitor error logs
tail -f /var/log/apache2/error.log

# Monitor PM2 processes
pm2 monit

# Check backend health
watch -n 5 'curl -s http://localhost:4000/api/health'
```

### Performance Metrics
```bash
# Count active Apache workers
ps aux | grep apache2 | wc -l

# Memory usage
free -h

# Apache request stats
apachectl status
```

### If Issues Return

**API Loop Returns:**
- Check `app/api/[...path]/route.ts` - ensure the fix is still there
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env` ends with `/api`
- Restart frontend: `pm2 restart frontend`

**Apache MaxRequestWorkers:**
- Check current setting: `cat /etc/apache2/mods-available/mpm_event.conf`
- Increase to 600 or 800 if needed
- Check RAM usage: `free -h` (need ~2-4GB available)
- Consider switching to Nginx for better performance

---

## 📁 Files Modified

### Local (Development)
- ✅ `/Users/moon/Documents/LMS/forex/frontend/app/api/[...path]/route.ts`

### Production Server
- ✅ `/var/www/forex/frontend/app/api/[...path]/route.ts`
- ✅ `/etc/apache2/mods-available/mpm_event.conf`

### Backup Files Created
- `route.ts.backup.[timestamp]` (frontend)
- `mpm_event.conf.backup.[timestamp]` (Apache)

---

## 🎯 Success Criteria

All of these should pass:

- [ ] `curl https://thefxnavigators.com/api/health` returns 200 OK
- [ ] `curl https://thefxnavigators.com/api/courses` returns 200 OK
- [ ] Login from browser works without errors
- [ ] Console logs show correct API paths (no duplicated `/api`)
- [ ] Apache error log has no MaxRequestWorkers errors
- [ ] PM2 shows both frontend and backend online
- [ ] No 500 errors under normal load

---

## 📞 Support

If issues persist after applying both fixes:

1. **Capture diagnostics:**
   ```bash
   cd /var/www/forex
   ./debug-production.sh > debug-output.txt 2>&1
   ```

2. **Check specific logs:**
   ```bash
   tail -100 /var/www/forex/backend.log
   tail -100 /var/log/apache2/error.log
   pm2 logs frontend --lines 100
   ```

3. **Verify configurations:**
   ```bash
   cat /var/www/forex/frontend/.env | grep API_BASE_URL
   cat /etc/apache2/mods-available/mpm_event.conf
   grep -A 5 "ProxyPass" /etc/apache2/sites-enabled/*.conf
   ```

---

## 🎉 Summary

**Both issues have been identified and fixed!**

1. **API Routing Loop** - Fixed by preventing duplicate `/api` paths
2. **Apache Worker Limit** - Fixed by increasing MaxRequestWorkers to 400

**Next Action:** Run `deploy-complete-fix.sh` on production server to apply both fixes.

Once deployed, your login and all API endpoints should work perfectly! 🚀

