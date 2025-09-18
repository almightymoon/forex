#!/usr/bin/env node

/**
 * Update Gmail Configuration with Correct App Password
 * This script updates the Gmail SMTP settings with the provided app password
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateGmailConfig() {
  try {
    console.log('📧 Updating Gmail Configuration with Correct App Password\n');
    
    // Get current settings
    const currentSettings = await Settings.getSettings();
    console.log('📊 Current Email User:', currentSettings.email?.smtpUser || 'Not set');

    // Update with the correct app password (remove spaces)
    const appPassword = 'gpra bjfj lnmv vpfa'.replace(/\s+/g, ''); // Remove spaces
    console.log('🔑 Using App Password:', appPassword);

    const updatedSettings = {
      ...currentSettings.toObject(),
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com',
        smtpPassword: appPassword,
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('🔧 Updating Gmail configuration...');
    await Settings.updateSettings(updatedSettings);
    console.log('✅ Gmail configuration updated successfully!');

    // Test the configuration
    console.log('\n🧪 Testing Gmail SMTP connection...');
    const notificationService = require('./services/notificationService');
    
    const refreshSuccess = await notificationService.refreshEmailTransporter();
    console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

    if (refreshSuccess) {
      console.log('\n🎉 Gmail SMTP connection successful!');
      console.log('📧 Email notifications are now working');
      
      // Test sending a real email
      console.log('\n📤 Testing email sending...');
      const testResult = await notificationService.sendEmail({
        to: 'atharqulimoon@gmail.com',
        subject: 'Test Email from Forex Navigators',
        html: '<h1>Test Email</h1><p>This is a test email from the Forex Navigators platform.</p>',
        text: 'Test Email\n\nThis is a test email from the Forex Navigators platform.',
        userId: null,
        type: 'test'
      });
      
      console.log('Test Email Sent:', testResult ? '✅ Success' : '❌ Failed');
      
      if (testResult) {
        console.log('\n🎯 Email system is fully functional!');
        console.log('You can now:');
        console.log('• Send notifications through admin panel');
        console.log('• Send bulk emails to users');
        console.log('• Send custom emails to external addresses');
      }
    } else {
      console.log('\n❌ Gmail connection still failing');
      console.log('Possible issues:');
      console.log('• App password might be incorrect');
      console.log('• 2FA not enabled on Gmail account');
      console.log('• Network/firewall blocking SMTP');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

updateGmailConfig();
