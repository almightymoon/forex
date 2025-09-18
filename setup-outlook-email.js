#!/usr/bin/env node

/**
 * Alternative email configuration using Outlook
 * This provides a backup solution if Gmail doesn't work
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setupOutlookEmail() {
  try {
    console.log('📧 Setting up Outlook Email Configuration\n');
    
    // Outlook configuration (more permissive than Gmail)
    const outlookConfig = {
      email: {
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@outlook.com', // You can create a free Outlook account
        smtpPassword: 'your-outlook-password', // Replace with actual password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('📝 Outlook Configuration:');
    console.log(JSON.stringify(outlookConfig, null, 2));

    console.log('\n🔧 Steps to use Outlook:');
    console.log('1. Create a free Outlook account at https://outlook.com');
    console.log('2. Replace "atharqulimoon@outlook.com" with your Outlook email');
    console.log('3. Replace "your-outlook-password" with your Outlook password');
    console.log('4. Uncomment the updateSettings line below');
    console.log('5. Run this script again\n');

    // Uncomment to apply Outlook configuration
    // await Settings.updateSettings(outlookConfig);
    // console.log('✅ Outlook configuration applied!');

    console.log('💡 Why Outlook might work better:');
    console.log('• Less strict authentication requirements');
    console.log('• No need for app passwords initially');
    console.log('• More reliable for development');

    console.log('\n🧪 Test after setup:');
    console.log('node check-smtp-status.js');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setupOutlookEmail();

