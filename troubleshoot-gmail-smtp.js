#!/usr/bin/env node

/**
 * Gmail SMTP Troubleshooting and Fix
 * This script helps diagnose and fix Gmail SMTP connection issues
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
      connectionTimeout: 15000, // 15 seconds
      greetingTimeout: 10000,   // 10 seconds
      socketTimeout: 15000      // 15 seconds
    });

    transporter.verify((error, success) => {
      if (error) {
        resolve({ success: false, error: error.message, code: error.code });
      } else {
        resolve({ success: true, message: 'Connection successful' });
      }
    });
  });
}

async function troubleshootGmailSmtp() {
  try {
    console.log('🔧 Gmail SMTP Troubleshooting\n');
    
    console.log('📧 Your Gmail Details:');
    console.log('Email: atharqulimoon@gmail.com');
    console.log('App Name: forex');
    console.log('App Password: gpra bjfj lnmv vpfa\n');

    // Clean the app password (remove spaces)
    const cleanAppPassword = 'gpra bjfj lnmv vpfa'.replace(/\s+/g, '');
    console.log('🧹 Cleaned App Password:', cleanAppPassword);

    // Test different Gmail configurations
    const configurations = [
      {
        name: 'Gmail SMTP (Port 587) - Standard',
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'atharqulimoon@gmail.com',
          smtpPassword: cleanAppPassword,
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      },
      {
        name: 'Gmail SMTP (Port 465) - SSL',
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpUser: 'atharqulimoon@gmail.com',
          smtpPassword: cleanAppPassword,
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      },
      {
        name: 'Gmail SMTP (Port 25) - Alternative',
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 25,
          smtpUser: 'atharqulimoon@gmail.com',
          smtpPassword: cleanAppPassword,
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      }
    ];

    console.log('🧪 Testing Gmail SMTP configurations...\n');

    let workingConfig = null;
    for (const { name, config } of configurations) {
      console.log(`Testing: ${name}`);
      const result = await testSmtpConnection(config);
      
      if (result.success) {
        console.log(`✅ ${name}: SUCCESS`);
        workingConfig = config;
        break;
      } else {
        console.log(`❌ ${name}: FAILED - ${result.error}`);
        if (result.code) {
          console.log(`   Error Code: ${result.code}`);
        }
      }
    }

    if (workingConfig) {
      console.log('\n🎉 Found working configuration!');
      console.log('Updating database with working Gmail settings...');
      
      const updatedSettings = {
        email: {
          ...workingConfig,
          isMockMode: false
        }
      };

      await Settings.updateSettings(updatedSettings);
      console.log('✅ Gmail configuration updated successfully!');

      // Test the notification service
      console.log('\n🧪 Testing notification service...');
      const notificationService = require('./services/notificationService');
      
      const refreshSuccess = await notificationService.refreshEmailTransporter();
      console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

      if (refreshSuccess) {
        console.log('\n📧 Testing email sending...');
        const testResult = await notificationService.sendEmail({
          to: 'atharqulimoon@gmail.com',
          subject: 'Test Email from Forex Navigators',
          html: '<h1>Test Email</h1><p>This is a test email from the Forex Navigators platform.</p><p>If you receive this, Gmail SMTP is working correctly!</p>',
          text: 'Test Email\n\nThis is a test email from the Forex Navigators platform.\n\nIf you receive this, Gmail SMTP is working correctly!',
          userId: null,
          type: 'test'
        });
        
        console.log('Test Email Sent:', testResult ? '✅ Success' : '❌ Failed');
        
        if (testResult) {
          console.log('\n🎯 Gmail SMTP is fully functional!');
          console.log('You can now send notifications through the admin panel.');
        }
      }
    } else {
      console.log('\n❌ All Gmail configurations failed. Let\'s try alternatives...\n');
      
      // Try Outlook as alternative
      console.log('📧 Trying Outlook as alternative...');
      const outlookConfig = {
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@outlook.com', // You can create this
        smtpPassword: 'your-outlook-password',
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      };

      console.log('📝 Outlook Configuration:');
      console.log(JSON.stringify(outlookConfig, null, 2));

      console.log('\n🔧 Gmail Troubleshooting Steps:');
      console.log('1. Verify App Password:');
      console.log('   • Go to: https://myaccount.google.com/security');
      console.log('   • Sign in with: atharqulimoon@gmail.com');
      console.log('   • Check if 2-Step Verification is enabled');
      console.log('   • Go to "App passwords" section');
      console.log('   • Verify the app password is correct');
      console.log('   • Make sure it\'s for "Mail" application');
      console.log('');
      console.log('2. Check Gmail Security Settings:');
      console.log('   • Go to: https://myaccount.google.com/security');
      console.log('   • Look for "Less secure app access" (if available)');
      console.log('   • Make sure it\'s not blocking SMTP');
      console.log('');
      console.log('3. Network/Firewall Issues:');
      console.log('   • Check if your network blocks SMTP ports');
      console.log('   • Try from a different network');
      console.log('   • Check if antivirus is blocking the connection');
      console.log('');
      console.log('4. Alternative Solutions:');
      console.log('   • Create Outlook account: https://outlook.com');
      console.log('   • Use SendGrid (100 free emails/day)');
      console.log('   • Use Mailgun for production');
      console.log('   • Use mock email service for development');

      // Set up mock email service as fallback
      console.log('\n🔧 Setting up mock email service as fallback...');
      const mockConfig = {
        email: {
          smtpHost: 'mock.localhost',
          smtpPort: 1025,
          smtpUser: 'mock@localhost',
          smtpPassword: 'mock',
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators',
          isMockMode: true
        }
      };

      await Settings.updateSettings({ email: mockConfig });
      console.log('✅ Mock email service configured!');
      console.log('📝 Emails will be logged to console instead of sent');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

troubleshootGmailSmtp();
