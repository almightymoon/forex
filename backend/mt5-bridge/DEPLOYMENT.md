# MT5 Bridge Deployment Guide

## Automated Deployment (CI/CD)

The MT5 bridge is automatically deployed via GitHub Actions when you push to the `main` branch.

### What the Pipeline Does:

1. **Checks out code** from repository
2. **Pulls latest changes** on server
3. **Installs Node.js dependencies**
4. **Builds frontend**
5. **Sets up MT5 Bridge:**
   - Checks for Python 3 (installs if missing)
   - Creates virtual environment
   - Installs Python dependencies
   - Creates `.env` file if needed
6. **Restarts all services:**
   - Frontend (PM2)
   - Backend (PM2)
   - MT5 Bridge (PM2)

## Manual Deployment

If you need to deploy manually:

### Step 1: SSH into Server

```bash
ssh user@your-server-ip
cd /var/www/forex/mt5-bridge
```

### Step 2: Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

### Step 3: Start with PM2

```bash
# Start MT5 Bridge
pm2 start venv/bin/python3 --name "mt5-bridge" -- app.py

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs mt5-bridge
```

## PM2 Management

### Start Bridge
```bash
pm2 start venv/bin/python3 --name "mt5-bridge" -- app.py
```

### Stop Bridge
```bash
pm2 stop mt5-bridge
```

### Restart Bridge
```bash
pm2 restart mt5-bridge
```

### View Logs
```bash
pm2 logs mt5-bridge
pm2 logs mt5-bridge --lines 100  # Last 100 lines
```

### Monitor
```bash
pm2 monit
```

### Delete from PM2
```bash
pm2 delete mt5-bridge
```

## Environment Configuration

The `.env` file is automatically created during deployment. To modify:

```bash
cd /var/www/forex/mt5-bridge
nano .env
```

Then restart:
```bash
pm2 restart mt5-bridge
```

## Troubleshooting

### Bridge Not Starting

1. **Check Python installation:**
   ```bash
   python3 --version
   ```

2. **Check virtual environment:**
   ```bash
   source venv/bin/activate
   python --version
   ```

3. **Check dependencies:**
   ```bash
   pip list
   pip install -r requirements.txt
   ```

4. **Check PM2 logs:**
   ```bash
   pm2 logs mt5-bridge --err
   ```

### Port Already in Use

If port 8080 is already in use:

1. Change PORT in `.env` file
2. Update `MT5_API_URL` in main project `.env`
3. Restart bridge:
   ```bash
   pm2 restart mt5-bridge
   ```

### MT5 Connection Issues

1. **Ensure MT5 terminal is running** on the server
2. **Check MT5 credentials** in user accounts
3. **Verify firewall** allows connections
4. **Check bridge logs** for specific errors

## Production Checklist

- [ ] Python 3.8+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] `.env` file configured
- [ ] PM2 process running
- [ ] PM2 auto-start configured (`pm2 startup`)
- [ ] Logs directory created
- [ ] Firewall configured
- [ ] MT5 terminal running
- [ ] Health check endpoint working

## Health Check

Test the bridge is running:

```bash
curl http://localhost:8080/health
```

Should return:
```json
{
  "status": "ok",
  "service": "MT5 REST API Bridge",
  "timestamp": "2024-01-01T00:00:00"
}
```

## Auto-Start on Server Reboot

To ensure MT5 bridge starts automatically:

```bash
pm2 startup
pm2 save
```

This will generate a startup script that PM2 will use on system boot.

