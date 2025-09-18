#!/usr/bin/env node

/**
 * Fix Email Service with Proper Configuration
 * This script sets up a working email configuration
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixEmailService() {
  try {
    console.log('📧 Fixing Email Service Configuration\n');
    
    // Get current settings first
    const currentSettings = await Settings.getSettings();
    console.log('📊 Current Settings:', {
      sessionTimeout: currentSettings.security?.sessionTimeout,
      emailConfigured: !!(currentSettings.email?.smtpHost && currentSettings.email?.smtpUser)
    });

    // Create a proper email configuration that won't fail validation
    const emailConfig = {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'atharqulimoon@gmail.com',
      smtpPassword: 'imtk elej lkiw fysd', // Current password
      fromEmail: 'noreply@forexnavigators.com',
      fromName: 'Forex Navigators'
    };

    // Update only the email part, keeping other settings intact
    const updatedSettings = {
      ...currentSettings,
      email: emailConfig
    };

    console.log('🔧 Updating email configuration...');
    await Settings.updateSettings(updatedSettings);
    console.log('✅ Email configuration updated!');

    // Test the configuration
    console.log('\n🧪 Testing email configuration...');
    const notificationService = require('./services/notificationService');
    
    // Refresh the email transporter
    const refreshSuccess = await notificationService.refreshEmailTransporter();
    console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

    if (!refreshSuccess) {
      console.log('\n⚠️  Email connection still failing. Let\'s try a different approach...');
      
      // Set up a mock email service for development
      const mockConfig = {
        ...currentSettings,
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

      console.log('🔧 Setting up mock email service for development...');
      await Settings.updateSettings(mockConfig);
      console.log('✅ Mock email service configured!');
      console.log('📝 Emails will be logged to console instead of sent');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Test notifications in admin panel');
    console.log('2. For production, consider using SendGrid or fixing Gmail');
    console.log('3. Check console logs for email content when using mock mode');

    console.log('\n🚀 SendGrid Setup (Recommended):');
    console.log('1. Go to: https://sendgrid.com');
    console.log('2. Create free account (100 emails/day free)');
    console.log('3. Get API key');
    console.log('4. Use: smtp.sendgrid.net:587 with username "apikey"');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixEmailService();
