#!/usr/bin/env node

/**
 * Update SMTP Password in Admin Settings
 * This script helps you update the SMTP password in the database
 */

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateSmtpPassword() {
  try {
    console.log('🔧 Update SMTP Password in Admin Settings\n');
    
    console.log('📋 Current SMTP Settings:');
    const currentSettings = await Settings.findOne();
    if (currentSettings && currentSettings.email) {
      console.log(`• SMTP Host: ${currentSettings.email.smtpHost}`);
      console.log(`• SMTP Port: ${currentSettings.email.smtpPort}`);
      console.log(`• SMTP User: ${currentSettings.email.smtpUser}`);
      console.log(`• SMTP Password: ${currentSettings.email.smtpPassword ? '***SET***' : 'NOT SET'}`);
      console.log(`• From Email: ${currentSettings.email.fromEmail}`);
      console.log(`• From Name: ${currentSettings.email.fromName}`);
    } else {
      console.log('❌ No SMTP settings found in database');
    }

    console.log('\n🔑 Gmail App Password Setup:');
    console.log('1. Go to: https://myaccount.google.com/security');
    console.log('2. Sign in with: atharqulimoon@gmail.com');
    console.log('3. Enable 2-Step Verification (if not already enabled)');
    console.log('4. Go to "App passwords" section');
    console.log('5. Select "Mail" and generate a password');
    console.log('6. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")');
    console.log('7. Remove spaces: "abcdefghijklmnop"\n');

    console.log('⚠️  Important:');
    console.log('• You MUST use the App Password, not your regular Gmail password');
    console.log('• The App Password is different from your login password');
    console.log('• It will look like: "abcd efgh ijkl mnop" (remove spaces)\n');

    // Get the new password from command line argument
    const newPassword = process.argv[2];
    
    if (!newPassword) {
      console.log('💡 Usage:');
      console.log('node update-smtp-password.js YOUR_APP_PASSWORD');
      console.log('');
      console.log('Example:');
      console.log('node update-smtp-password.js abcdefghijklmnop');
      console.log('');
      console.log('🔧 Alternative: Update through Admin Panel');
      console.log('1. Go to Admin Dashboard → Settings');
      console.log('2. Find "Email Configuration" section');
      console.log('3. Update "SMTP Password" field with your App Password');
      console.log('4. Click "Save Settings"');
      console.log('5. Test the configuration');
      return;
    }

    console.log('🔄 Updating SMTP password...');
    
    // Update the password
    const updatedSettings = await Settings.updateSettings({
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com',
        smtpPassword: newPassword,
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    });

    console.log('✅ SMTP password updated successfully!');
    console.log('\n📊 Updated Settings:');
    console.log(`• SMTP Host: ${updatedSettings.email.smtpHost}`);
    console.log(`• SMTP Port: ${updatedSettings.email.smtpPort}`);
    console.log(`• SMTP User: ${updatedSettings.email.smtpUser}`);
    console.log(`• SMTP Password: ***UPDATED***`);
    console.log(`• From Email: ${updatedSettings.email.fromEmail}`);
    console.log(`• From Name: ${updatedSettings.email.fromName}`);

    console.log('\n🧪 Test the configuration:');
    console.log('node check-smtp-status.js');

  } catch (error) {
    console.error('❌ Error updating SMTP password:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

updateSmtpPassword();

