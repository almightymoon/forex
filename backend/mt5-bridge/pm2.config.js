/**
 * PM2 Configuration for MT5 Bridge
 * 
 * Usage: pm2 start pm2.config.js
 * Or: pm2 start app.py --name mt5-bridge --interpreter venv/bin/python3
 */

module.exports = {
  apps: [{
    name: 'mt5-bridge',
    script: 'app.py',
    interpreter: 'venv/bin/python3',
    cwd: '/var/www/forex/mt5-bridge',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      PORT: 8080,
      HOST: '0.0.0.0',
      DEBUG: 'False'
    },
    error_file: './logs/mt5-bridge-error.log',
    out_file: './logs/mt5-bridge-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

