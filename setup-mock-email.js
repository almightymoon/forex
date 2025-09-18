#!/usr/bin/env node

/**
 * Setup Mock Email Service for Development
 * Since Gmail is blocked by network/firewall, we'll use a mock service
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setupMockEmail() {
  try {
    console.log('📧 Setting up Mock Email Service\n');
    
    const currentSettings = await Settings.getSettings();
    
    // Set up mock email configuration
    const mockSettings = {
      ...currentSettings.toObject(),
      email: {
        smtpHost: 'localhost',
        smtpPort: 1025,
        smtpUser: 'test@localhost',
        smtpPassword: 'test',
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators',
        isMockMode: true
      }
    };

    console.log('🔧 Configuring mock email service...');
    await Settings.updateSettings(mockSettings);
    console.log('✅ Mock email service configured!');

    console.log('\n📋 Mock Email Service Features:');
    console.log('• Emails are logged to console instead of sent');
    console.log('• Perfect for development and testing');
    console.log('• No network dependencies');
    console.log('• All notification features work normally');

    console.log('\n🧪 Testing mock email service...');
    const notificationService = require('./services/notificationService');
    
    const refreshSuccess = await notificationService.refreshEmailTransporter();
    console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

    console.log('\n🎯 Ready for testing!');
    console.log('1. Go to admin panel: http://localhost:3000/admin');
    console.log('2. Navigate to Notifications tab');
    console.log('3. Send test notifications');
    console.log('4. Check server console for email logs');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setupMockEmail();
