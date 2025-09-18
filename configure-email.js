#!/usr/bin/env node

/**
 * Configure email settings for better delivery
 * This script helps set up email configuration with different providers
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function configureEmailSettings() {
  try {
    console.log('🔧 Email Configuration Helper\n');
    
    console.log('📧 Available Email Providers:');
    console.log('1. Gmail (requires App Password)');
    console.log('2. Outlook/Hotmail');
    console.log('3. Yahoo Mail');
    console.log('4. SendGrid (recommended for production)');
    console.log('5. Mailgun (recommended for production)');
    console.log('6. Custom SMTP\n');

    // Gmail with App Password configuration
    const gmailConfig = {
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'your-email@gmail.com', // Replace with your Gmail
        smtpPassword: 'your-app-password', // Replace with 16-character app password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    // Outlook configuration
    const outlookConfig = {
      email: {
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpUser: 'your-email@outlook.com', // Replace with your Outlook email
        smtpPassword: 'your-password', // Replace with your password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    // Yahoo configuration
    const yahooConfig = {
      email: {
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 587,
        smtpUser: 'your-email@yahoo.com', // Replace with your Yahoo email
        smtpPassword: 'your-app-password', // Replace with Yahoo app password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('🔑 Gmail App Password Setup:');
    console.log('1. Go to https://myaccount.google.com/security');
    console.log('2. Enable 2-Step Verification if not already enabled');
    console.log('3. Go to App passwords');
    console.log('4. Select "Mail" and generate a password');
    console.log('5. Use this 16-character password in the configuration\n');

    console.log('📝 Current Configuration:');
    const settings = await Settings.getSettings();
    console.log('SMTP Host:', settings.email.smtpHost);
    console.log('SMTP Port:', settings.email.smtpPort);
    console.log('SMTP User:', settings.email.smtpUser);
    console.log('From Email:', settings.email.fromEmail);
    console.log('From Name:', settings.email.fromName);
    console.log('Password Set:', !!settings.email.smtpPassword);

    console.log('\n💡 Recommendations:');
    console.log('• For development: Use Gmail with App Password');
    console.log('• For production: Use SendGrid or Mailgun');
    console.log('• Always use App Passwords for Gmail/Yahoo');
    console.log('• Test configuration before going live');

    console.log('\n🔧 To update configuration:');
    console.log('1. Edit the configuration object above');
    console.log('2. Run: await Settings.updateSettings(yourConfig)');
    console.log('3. Test with: node check-smtp-status.js');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

configureEmailSettings();

