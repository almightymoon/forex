# Production Environment Setup Guide

## Forex Navigators LMS - Backend Production Configuration

This guide will help you set up the production environment for the Forex Navigators Learning Management System backend.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Third-Party Services](#third-party-services)
5. [Security Configuration](#security-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Testing](#testing)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v5.0 or higher
- **npm**: v8.0.0 or higher
- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows Server

### Required Accounts & Services
- MongoDB (local or MongoDB Atlas for cloud hosting)
- Cloudinary account (for media storage)
- Stripe account (for international payments)
- EasyPaisa merchant account (for Pakistan payments)
- JazzCash merchant account (for Pakistan payments)
- SMTP email service (SendGrid, AWS SES, Mailgun, or Gmail)

---

## Environment Setup

### Step 1: Create Production Environment File

1. Navigate to the backend directory:
   ```bash
   cd /path/to/forex
   ```

2. Copy the environment template:
   ```bash
   cp env.production.template .env.production
   ```

3. Open `.env.production` in your preferred text editor:
   ```bash
   nano .env.production
   # or
   vim .env.production
   # or use any text editor
   ```

### Step 2: Generate JWT Secret

Generate a secure JWT secret key:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and replace the `JWT_SECRET` value in your `.env.production` file.

---

## Database Configuration

### Option 1: MongoDB Atlas (Cloud - Recommended for Production)

1. **Create a MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new account or sign in
   - Create a new cluster

2. **Configure Database Access**
   - Create a database user with a strong password
   - Whitelist your application server's IP address
   - Or allow access from anywhere (0.0.0.0/0) if using dynamic IPs

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/forex-lms-production`

4. **Update Environment Variables**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/forex-lms-production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/forex-lms-production
   ```

### Option 2: Self-Hosted MongoDB

1. **Install MongoDB** (Ubuntu example):
   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

2. **Create Database and User**:
   ```bash
   mongo
   ```
   ```javascript
   use forex-lms-production
   db.createUser({
     user: "forexadmin",
     pwd: "your-secure-password",
     roles: [{ role: "readWrite", db: "forex-lms-production" }]
   })
   ```

3. **Update Environment Variables**:
   ```env
   MONGO_URI=mongodb://forexadmin:your-secure-password@localhost:27017/forex-lms-production
   MONGODB_URI=mongodb://forexadmin:your-secure-password@localhost:27017/forex-lms-production
   ```

---

## Third-Party Services

### 1. Cloudinary Setup (Media Storage)

1. **Create Account**
   - Go to [Cloudinary](https://cloudinary.com)
   - Sign up for a free account
   - Navigate to Dashboard

2. **Get Credentials**
   - Find your Cloud Name, API Key, and API Secret
   - Update `.env.production`:
     ```env
     CLOUDINARY_CLOUD_NAME=your-cloud-name
     CLOUDINARY_API_KEY=your-api-key
     CLOUDINARY_API_SECRET=your-api-secret
     ```

### 2. Stripe Setup (International Payments)

1. **Create Stripe Account**
   - Go to [Stripe](https://stripe.com)
   - Complete business verification
   - Activate your account

2. **Get API Keys**
   - Navigate to Developers > API Keys
   - Copy **Live** keys (not test keys)
   - Update `.env.production`:
     ```env
     STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
     STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
     ```

3. **Setup Webhooks**
   - Navigate to Developers > Webhooks
   - Add endpoint: `https://api.thefxnavigators.com/api/payments/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook signing secret
   - Update `.env.production`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     ```

### 3. EasyPaisa Setup (Pakistan Payments)

1. **Apply for Merchant Account**
   - Contact EasyPaisa business team
   - Complete merchant registration
   - Receive credentials

2. **Update Configuration**:
   ```env
   EASYPAISA_BASE_URL=https://easypay.easypaisa.com.pk
   EASYPAISA_STORE_ID=your-store-id
   EASYPAISA_STORE_PASSWORD=your-store-password
   EASYPAISA_API_KEY=your-api-key
   EASYPAISA_RETURN_URL=https://thefxnavigators.com/payment/easypaisa/callback
   EASYPAISA_NOTIFY_URL=https://api.thefxnavigators.com/api/payments/easypaisa/webhook
   ```

### 4. JazzCash Setup (Pakistan Payments)

1. **Apply for Merchant Account**
   - Contact JazzCash business team
   - Complete merchant registration
   - Receive credentials

2. **Update Configuration**:
   ```env
   JAZZCASH_BASE_URL=https://payments.jazzcash.com.pk
   JAZZCASH_MERCHANT_ID=your-merchant-id
   JAZZCASH_PASSWORD=your-password
   JAZZCASH_INTEGRATION_ID=your-integration-id
   JAZZCASH_RETURN_URL=https://thefxnavigators.com/payment/jazzcash/callback
   JAZZCASH_NOTIFY_URL=https://api.thefxnavigators.com/api/payments/jazzcash/webhook
   ```

### 5. Email Service (SMTP)

#### Option A: SendGrid (Recommended)

1. **Create SendGrid Account**
   - Go to [SendGrid](https://sendgrid.com)
   - Create account and verify email
   - Navigate to Settings > API Keys
   - Create an API key

2. **Update Configuration**:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM_NAME=Forex Navigators
   EMAIL_FROM_ADDRESS=noreply@thefxnavigators.com
   EMAIL_MOCK_MODE=false
   ```

#### Option B: Gmail (Not recommended for production)

1. **Enable 2-Step Verification**
2. **Generate App Password**
3. **Update Configuration**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM_NAME=Forex Navigators
   EMAIL_FROM_ADDRESS=your-email@gmail.com
   EMAIL_MOCK_MODE=false
   ```

---

## Security Configuration

### 1. CORS Configuration

Update allowed origins in `.env.production`:
```env
CORS_ORIGINS=https://thefxnavigators.com,https://www.thefxnavigators.com,https://admin.thefxnavigators.com
```

### 2. Rate Limiting

Configure rate limiting to prevent abuse:
```env
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=5000
```

### 3. Session Security

Configure session timeout and security:
```env
SESSION_TIMEOUT=86400000
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION=1800000
PASSWORD_RESET_EXPIRY=3600000
```

### 4. SSL/TLS

Ensure your production server uses HTTPS. If using reverse proxy (Nginx/Apache), SSL is handled there. If serving directly from Node.js, uncomment and configure:
```env
SSL_KEY_PATH=/path/to/ssl/private.key
SSL_CERT_PATH=/path/to/ssl/certificate.crt
```

---

## Deployment Steps

### Method 1: Direct Deployment

1. **Install Dependencies**:
   ```bash
   cd /path/to/forex
   npm install --production
   ```

2. **Set Environment**:
   ```bash
   # Create symbolic link to production env
   ln -sf .env.production .env
   ```

3. **Start Application**:
   ```bash
   # Using PM2 (recommended)
   npm install -g pm2
   pm2 start server.js --name forex-lms-backend
   pm2 save
   pm2 startup
   
   # Or using direct node
   NODE_ENV=production node server.js
   ```

### Method 2: Docker Deployment

1. **Create Dockerfile** (if not exists):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 4000
   CMD ["node", "server.js"]
   ```

2. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: .
       ports:
         - "4000:4000"
       env_file:
         - .env.production
       restart: unless-stopped
       depends_on:
         - mongodb
     
     mongodb:
       image: mongo:5.0
       ports:
         - "27017:27017"
       environment:
         MONGO_INITDB_ROOT_USERNAME: admin
         MONGO_INITDB_ROOT_PASSWORD: password
       volumes:
         - mongodb_data:/data/db
   
   volumes:
     mongodb_data:
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

### Method 3: Using PM2 with Environment Files

```bash
# Install PM2
npm install -g pm2

# Create ecosystem config
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'forex-lms-backend',
    script: 'server.js',
    instances: 4,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Testing

### 1. Health Check

Test the server is running:
```bash
curl https://api.thefxnavigators.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-07T...",
  "uptime": 123.456
}
```

### 2. Database Connection

Check server logs for database connection:
```bash
pm2 logs forex-lms-backend | grep MongoDB
```

Should see: `Connected to MongoDB: mongodb://...`

### 3. Payment Gateway Testing

- Test Stripe with test card: 4242 4242 4242 4242
- Verify webhook endpoints are accessible
- Check payment callback URLs

### 4. Email Testing

Test email configuration from admin panel:
- Navigate to Settings > Email
- Click "Test Email Configuration"

---

## Monitoring & Maintenance

### 1. Application Monitoring

Using PM2:
```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart forex-lms-backend
```

### 2. Database Backups

Automated backup script (add to crontab):
```bash
#!/bin/bash
# backup-mongodb.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://user:password@localhost:27017/forex-lms-production" \
  --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} +
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
# Add line:
0 2 * * * /path/to/backup-mongodb.sh
```

### 3. Log Rotation

Configure log rotation:
```bash
sudo nano /etc/logrotate.d/forex-lms

# Add:
/path/to/forex/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. SSL Certificate Renewal

If using Let's Encrypt:
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d api.thefxnavigators.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
```

---

## Troubleshooting

### Issue: Cannot Connect to Database

**Solution**:
1. Check MongoDB is running: `sudo systemctl status mongod`
2. Verify connection string in `.env.production`
3. Check firewall rules: `sudo ufw status`
4. Test connection: `mongo "mongodb://user:password@localhost:27017/forex-lms-production"`

### Issue: Cloudinary Upload Fails

**Solution**:
1. Verify credentials in `.env.production`
2. Check Cloudinary dashboard for usage limits
3. Review server logs for specific errors
4. Test credentials manually

### Issue: Payment Webhook Not Working

**Solution**:
1. Ensure webhook URL is publicly accessible
2. Check SSL certificate is valid
3. Verify webhook signing secret
4. Review payment gateway logs
5. Test webhook with provided test tools

### Issue: Emails Not Sending

**Solution**:
1. Check SMTP credentials
2. Verify email settings in admin panel (Settings > Email)
3. Test SMTP connection manually
4. Check spam folder
5. Review email service provider logs
6. Ensure firewall allows SMTP ports (587, 465)

### Issue: High Memory Usage

**Solution**:
1. Check for memory leaks: `pm2 monit`
2. Restart application: `pm2 restart forex-lms-backend`
3. Optimize database queries
4. Add more server resources
5. Enable clustering in PM2

### Issue: WebSocket Connection Fails

**Solution**:
1. Check CORS configuration
2. Verify FRONTEND_URL in `.env.production`
3. Ensure WebSocket port is not blocked
4. Check reverse proxy configuration for WebSocket support

---

## Security Best Practices

1. **Never commit `.env.production` to version control**
2. **Use strong, unique passwords for all services**
3. **Enable 2FA on all service accounts**
4. **Regularly update dependencies**: `npm audit fix`
5. **Monitor logs for suspicious activity**
6. **Use HTTPS everywhere**
7. **Implement rate limiting**
8. **Regular security audits**
9. **Keep backups in multiple locations**
10. **Use environment secrets management (AWS Secrets Manager, HashiCorp Vault)**

---

## Performance Optimization

1. **Enable compression** (already configured in server.js)
2. **Use CDN for static assets**
3. **Implement Redis caching** (optional)
4. **Optimize database indexes**
5. **Use PM2 clustering mode**
6. **Enable gzip compression in Nginx/Apache**
7. **Monitor and optimize slow queries**

---

## Useful Commands

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs forex-lms-backend --lines 100

# Restart application
pm2 restart forex-lms-backend

# Reload application (zero-downtime)
pm2 reload forex-lms-backend

# Stop application
pm2 stop forex-lms-backend

# Delete application from PM2
pm2 delete forex-lms-backend

# Save PM2 configuration
pm2 save

# View environment variables
pm2 env 0

# Monitor resources
pm2 monit
```

---

## Support & Resources

- **Project Repository**: Contact admin for access
- **MongoDB Documentation**: https://docs.mongodb.com
- **Stripe Documentation**: https://stripe.com/docs
- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **PM2 Documentation**: https://pm2.keymetrics.io/docs

---

## Changelog

- **v1.0.0** - Initial production setup guide
- Include date and version when updating this document

---

**Last Updated**: October 7, 2025
**Maintained By**: Development Team

