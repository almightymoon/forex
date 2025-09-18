#!/usr/bin/env node

/**
 * Fix Mock Email Configuration
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixMockEmail() {
  try {
    console.log('🔧 Fixing Mock Email Configuration\n');
    
    const currentSettings = await Settings.getSettings();
    console.log('Current email config:', JSON.stringify(currentSettings.email, null, 2));
    
    // Create proper mock configuration
    const mockSettings = {
      ...currentSettings.toObject(),
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

    console.log('🔧 Updating with mock configuration...');
    await Settings.updateSettings(mockSettings);
    console.log('✅ Mock email configuration updated!');

    // Verify the update
    const updatedSettings = await Settings.getSettings();
    console.log('\n📊 Updated email config:');
    console.log('isMockMode:', updatedSettings.email.isMockMode);
    console.log('smtpHost:', updatedSettings.email.smtpHost);

    console.log('\n🧪 Testing mock email service...');
    const notificationService = require('./services/notificationService');
    
    // Refresh the service
    await notificationService.refreshEmailTransporter();
    
    // Test sending an email
    console.log('\n📤 Sending test email...');
    const result = await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email from Forex Navigators',
      html: '<h1>Test Email</h1><p>This is a test email from the Forex Navigators platform.</p>',
      text: 'Test Email\n\nThis is a test email from the Forex Navigators platform.',
      userId: null,
      type: 'test'
    });
    
    console.log('\n📊 Test Result:', result ? '✅ SUCCESS' : '❌ FAILED');
    
    if (result) {
      console.log('\n🎉 Mock email service is working!');
      console.log('📧 Email notifications are now functional');
      console.log('\n📋 Ready for testing:');
      console.log('1. Start your server: npm start');
      console.log('2. Go to admin panel: http://localhost:3000/admin');
      console.log('3. Navigate to Notifications tab');
      console.log('4. Send test notifications');
      console.log('5. Check server console for email logs');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

fixMockEmail();
