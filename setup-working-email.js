#!/usr/bin/env node

/**
 * Quick Email Service Setup
 * This script sets up a working email configuration for development
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setupWorkingEmailService() {
  try {
    console.log('📧 Setting up Working Email Service\n');
    
    console.log('🔍 Current Issue:');
    console.log('• Gmail SMTP is timing out (likely network/firewall issue)');
    console.log('• Need a working email service for notifications\n');

    console.log('💡 Recommended Solutions:\n');

    console.log('1. 🚀 QUICK FIX - Use Ethereal Email (Development):');
    console.log('   • Creates a fake SMTP server for testing');
    console.log('   • Perfect for development and testing');
    console.log('   • No real emails sent, but system works\n');

    console.log('2. 📧 PRODUCTION - Use SendGrid:');
    console.log('   • Professional email service');
    console.log('   • 100 free emails per day');
    console.log('   • Reliable delivery\n');

    console.log('3. 🔧 ALTERNATIVE - Use Outlook:');
    console.log('   • Create free Outlook account');
    console.log('   • Less restrictive than Gmail\n');

    // Let's set up Ethereal for immediate testing
    console.log('🔧 Setting up Ethereal Email for immediate testing...\n');

    const etherealConfig = {
      email: {
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'ethereal.user@ethereal.email',
        smtpPassword: 'ethereal.pass',
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators',
        isTestMode: true
      }
    };

    console.log('📝 Ethereal Configuration (for testing):');
    console.log(JSON.stringify(etherealConfig, null, 2));

    // For now, let's create a mock email service that logs instead of sending
    const mockEmailConfig = {
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

    console.log('\n🔧 Setting up Mock Email Service (logs emails instead of sending)...');
    await Settings.updateSettings({ email: mockEmailConfig });
    console.log('✅ Mock email configuration saved!');

    console.log('\n📋 Next Steps:');
    console.log('1. For immediate testing: Mock service will log emails to console');
    console.log('2. For production: Set up SendGrid or fix Gmail');
    console.log('3. Test notifications: Use the admin panel to send test emails');

    console.log('\n🚀 SendGrid Setup (Recommended for Production):');
    console.log('1. Go to: https://sendgrid.com');
    console.log('2. Create free account');
    console.log('3. Get API key from Settings > API Keys');
    console.log('4. Use these settings:');
    console.log('   • Host: smtp.sendgrid.net');
    console.log('   • Port: 587');
    console.log('   • Username: apikey');
    console.log('   • Password: [YOUR_SENDGRID_API_KEY]');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setupWorkingEmailService();
