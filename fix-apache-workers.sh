#!/bin/bash

echo "=== Fixing Apache MaxRequestWorkers Issue ==="

# Backup current configuration
echo "[1/4] Backing up Apache configuration..."
cp /etc/apache2/mods-available/mpm_event.conf /etc/apache2/mods-available/mpm_event.conf.backup.$(date +%Y%m%d_%H%M%S)

# Create optimized mpm_event configuration
echo "[2/4] Updating Apache MPM Event configuration..."
cat > /etc/apache2/mods-available/mpm_event.conf << 'EOF'
<IfModule mpm_event_module>
    # Increased values for production load
    StartServers             4
    MinSpareThreads          75
    MaxSpareThreads          250
    ThreadsPerChild          50
    MaxRequestWorkers        400
    MaxConnectionsPerChild   10000
    
    # Keep alive settings
    KeepAlive On
    MaxKeepAliveRequests 100
    KeepAliveTimeout 5
</IfModule>
EOF

echo "[3/4] Configuration updated. Testing Apache configuration..."
apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "[4/4] Configuration is valid. Restarting Apache..."
    systemctl restart apache2
    
    echo ""
    echo "✅ Apache has been successfully configured and restarted!"
    echo ""
    echo "New settings:"
    echo "  - MaxRequestWorkers: 400 (increased from default ~150)"
    echo "  - ThreadsPerChild: 50"
    echo "  - MinSpareThreads: 75"
    echo "  - MaxSpareThreads: 250"
    echo ""
    echo "Testing backend connectivity..."
    sleep 2
    curl -s https://thefxnavigators.com/api/health | head -5
    echo ""
    echo "If you see JSON above, the fix is successful!"
else
    echo "❌ Configuration test failed. Reverting to backup..."
    mv /etc/apache2/mods-available/mpm_event.conf.backup.* /etc/apache2/mods-available/mpm_event.conf
    echo "Backup restored. Please check the errors above."
fi

echo ""
echo "=== Monitoring Apache Status ==="
echo "To monitor Apache in real-time, run:"
echo "  watch -n 1 'apache2ctl status | head -20'"
echo ""
echo "To check if issue persists:"
echo "  tail -f /var/log/apache2/error.log"

