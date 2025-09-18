#!/usr/bin/env node

/**
 * Test Mock Email Service
 */

const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testMockEmail() {
  try {
    console.log('🧪 Testing Mock Email Service\n');
    
    console.log('📤 Sending test email...');
    const result = await notificationService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Email from Forex Navigators',
      html: '<h1>Test Email</h1><p>This is a test email from the Forex Navigators platform.</p><p>If you see this in the console, the mock email service is working!</p>',
      text: 'Test Email\n\nThis is a test email from the Forex Navigators platform.\n\nIf you see this in the console, the mock email service is working!',
      userId: null,
      type: 'test'
    });
    
    console.log('\n📊 Test Result:', result ? '✅ SUCCESS' : '❌ FAILED');
    
    if (result) {
      console.log('\n🎉 Mock email service is working!');
      console.log('📧 Email content was logged to console above');
      console.log('\n📋 Next steps:');
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

testMockEmail();
