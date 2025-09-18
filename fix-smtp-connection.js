#!/usr/bin/env node

/**
 * Comprehensive SMTP Connection Fix
 * This script tries multiple approaches to fix the email connection
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testSmtpConnection(config) {
  return new Promise((resolve) => {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      socketTimeout: 10000      // 10 seconds
    });

    transporter.verify((error, success) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, message: 'Connection successful' });
      }
    });
  });
}

async function fixSmtpConnection() {
  try {
    console.log('🔧 Comprehensive SMTP Connection Fix\n');
    
    console.log('🔍 Current Issue Analysis:');
    console.log('• Gmail SMTP connection is timing out');
    console.log('• This usually means:');
    console.log('  - App password is incorrect');
    console.log('  - 2FA not enabled');
    console.log('  - Gmail security settings blocking SMTP');
    console.log('  - Network/firewall issues\n');

    // Test different configurations
    const configurations = [
      {
        name: 'Gmail with App Password (Port 587)',
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'atharqulimoon@gmail.com',
          smtpPassword: 'imtk elej lkiw fysd', // Current password from check-smtp-status.js
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      },
      {
        name: 'Gmail with App Password (Port 465)',
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpUser: 'atharqulimoon@gmail.com',
          smtpPassword: 'imtk elej lkiw fysd',
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      },
      {
        name: 'Outlook Alternative',
        config: {
          smtpHost: 'smtp-mail.outlook.com',
          smtpPort: 587,
          smtpUser: 'atharqulimoon@outlook.com',
          smtpPassword: 'your-outlook-password', // You'll need to set this
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      }
    ];

    console.log('🧪 Testing different configurations...\n');

    for (const { name, config } of configurations) {
      console.log(`Testing: ${name}`);
      const result = await testSmtpConnection(config);
      
      if (result.success) {
        console.log(`✅ ${name}: SUCCESS`);
        console.log('Updating database with working configuration...');
        await Settings.updateSettings({ email: config });
        console.log('✅ Database updated!\n');
        
        // Test the notification service
        console.log('🧪 Testing notification service...');
        const notificationService = require('./services/notificationService');
        const refreshSuccess = await notificationService.refreshEmailTransporter();
        console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');
        
        console.log('\n🎉 SMTP connection fixed!');
        console.log('You can now send notifications through the admin panel.');
        return;
      } else {
        console.log(`❌ ${name}: FAILED - ${result.error}\n`);
      }
    }

    console.log('❌ All configurations failed. Manual setup required.\n');
    
    console.log('🔧 Manual Fix Instructions:');
    console.log('1. Gmail App Password Setup:');
    console.log('   • Go to: https://myaccount.google.com/security');
    console.log('   • Enable 2-Step Verification');
    console.log('   • Go to "App passwords"');
    console.log('   • Generate password for "Mail"');
    console.log('   • Use the 16-character password (remove spaces)');
    console.log('');
    console.log('2. Alternative - Use Outlook:');
    console.log('   • Create free account at https://outlook.com');
    console.log('   • Use smtp-mail.outlook.com:587');
    console.log('   • Use your Outlook email and password');
    console.log('');
    console.log('3. After getting credentials, run:');
    console.log('   node update-smtp-password.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixSmtpConnection();
