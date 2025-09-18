#!/usr/bin/env node

/**
 * Quick fix for Gmail SMTP authentication
 * This script provides instructions and can update the configuration
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixGmailAuth() {
  try {
    console.log('🔧 Gmail SMTP Authentication Fix\n');
    
    console.log('❌ Current Issue:');
    console.log('Gmail is rejecting login credentials because:');
    console.log('• Regular passwords are not allowed for SMTP');
    console.log('• Need to use App Password instead\n');

    console.log('✅ Solution - Gmail App Password:');
    console.log('1. Go to: https://myaccount.google.com/security');
    console.log('2. Enable 2-Step Verification (if not already enabled)');
    console.log('3. Go to "App passwords" section');
    console.log('4. Select "Mail" and generate a password');
    console.log('5. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")\n');

    console.log('🔧 To apply the fix:');
    console.log('1. Replace "your-app-password" below with your actual app password');
    console.log('2. Uncomment the updateSettings line');
    console.log('3. Run this script again\n');

    // Configuration with placeholder for app password
    const gmailConfig = {
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com', // Your Gmail address
        smtpPassword: 'your-app-password', // Replace with your 16-character app password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('📝 Configuration to use:');
    console.log(JSON.stringify(gmailConfig, null, 2));

    // Uncomment the line below after replacing 'your-app-password' with actual app password
    // await Settings.updateSettings(gmailConfig);
    // console.log('✅ Configuration updated!');

    console.log('\n🧪 After updating, test with:');
    console.log('node check-smtp-status.js');

    console.log('\n📧 Alternative Solutions:');
    console.log('• Use Outlook: smtp-mail.outlook.com:587');
    console.log('• Use Yahoo: smtp.mail.yahoo.com:587');
    console.log('• Use SendGrid for production');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixGmailAuth();

