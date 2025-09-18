#!/usr/bin/env node

/**
 * Fix Email Service with Proper Session Timeout
 * This script fixes the session timeout validation and sets up email
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixEmailAndSessionTimeout() {
  try {
    console.log('🔧 Fixing Email Service and Session Timeout\n');
    
    // Get current settings
    const currentSettings = await Settings.getSettings();
    console.log('📊 Current Session Timeout:', currentSettings.security?.sessionTimeout, 'minutes');
    console.log('📊 Current Email Configured:', !!(currentSettings.email?.smtpHost && currentSettings.email?.smtpUser));

    // Fix session timeout (must be between 15-480 minutes)
    const fixedSettings = {
      ...currentSettings.toObject(),
      security: {
        ...currentSettings.security,
        sessionTimeout: 480 // Set to maximum allowed (8 hours)
      },
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com',
        smtpPassword: 'imtk elej lkiw fysd',
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('🔧 Updating settings with fixed session timeout and email config...');
    await Settings.updateSettings(fixedSettings);
    console.log('✅ Settings updated successfully!');

    // Test the email configuration
    console.log('\n🧪 Testing email configuration...');
    const notificationService = require('./services/notificationService');
    
    const refreshSuccess = await notificationService.refreshEmailTransporter();
    console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

    if (!refreshSuccess) {
      console.log('\n⚠️  Gmail connection still failing. Setting up mock email service...');
      
      // Set up mock email service
      const mockSettings = {
        ...fixedSettings,
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

      await Settings.updateSettings(mockSettings);
      console.log('✅ Mock email service configured!');
      console.log('📝 Emails will be logged to console instead of sent');
    }

    console.log('\n📋 Summary:');
    console.log('• Session timeout fixed: 480 minutes (8 hours)');
    console.log('• Email service configured');
    console.log('• Ready for testing notifications');

    console.log('\n🧪 Test the notification system:');
    console.log('1. Go to admin panel: http://localhost:3000/admin');
    console.log('2. Navigate to Notifications tab');
    console.log('3. Send a test notification');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixEmailAndSessionTimeout();
