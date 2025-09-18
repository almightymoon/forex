#!/usr/bin/env node

/**
 * Gmail App Password Setup Helper
 * This script helps you configure Gmail with App Password for SMTP
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setupGmailAppPassword() {
  try {
    console.log('🔧 Gmail App Password Setup\n');
    
    console.log('📋 Step-by-Step Instructions:');
    console.log('1. Go to: https://myaccount.google.com/security');
    console.log('2. Sign in with your Gmail account (atharqulimoon@gmail.com)');
    console.log('3. Scroll down to "2-Step Verification" and enable it if not already enabled');
    console.log('4. After enabling 2-Step Verification, look for "App passwords"');
    console.log('5. Click "App passwords"');
    console.log('6. Select "Mail" from the dropdown');
    console.log('7. Click "Generate"');
    console.log('8. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")\n');

    console.log('⚠️  Important Notes:');
    console.log('• You MUST have 2-Step Verification enabled first');
    console.log('• App passwords are different from your regular Gmail password');
    console.log('• The password will look like: "abcd efgh ijkl mnop" (with spaces)');
    console.log('• Remove spaces when using it: "abcdefghijklmnop"\n');

    console.log('🔧 After getting your App Password:');
    console.log('1. Replace "YOUR_APP_PASSWORD_HERE" below with your actual app password');
    console.log('2. Uncomment the updateSettings line');
    console.log('3. Run this script again\n');

    // Configuration template
    const gmailConfig = {
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com',
        smtpPassword: 'YOUR_APP_PASSWORD_HERE', // Replace this with your actual app password
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('📝 Configuration to use:');
    console.log(JSON.stringify(gmailConfig, null, 2));

    // Uncomment the line below after replacing 'YOUR_APP_PASSWORD_HERE' with actual app password
    // await Settings.updateSettings(gmailConfig);
    // console.log('✅ Gmail configuration updated!');

    console.log('\n🧪 After updating, test with:');
    console.log('node check-smtp-status.js');

    console.log('\n📧 Alternative Quick Fix:');
    console.log('If Gmail is too complicated, you can use Outlook:');
    console.log('1. Create a free Outlook account at https://outlook.com');
    console.log('2. Use these settings:');
    console.log('   - Host: smtp-mail.outlook.com');
    console.log('   - Port: 587');
    console.log('   - Use your Outlook email and password');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setupGmailAppPassword();

