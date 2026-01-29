require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

async function updateSMTPCredentials() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/forex-lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get or create settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
      await settings.save();
    }

    // Update SMTP credentials
    // Gmail App Password: fdld vant ffep kxzf
    settings.email.smtpHost = 'smtp.gmail.com';
    settings.email.smtpPort = 587;
    settings.email.smtpUser = 'thefxnavigators@gmail.com';
    settings.email.smtpPassword = 'fdld vant ffep kxzf';
    settings.email.fromEmail = 'thefxnavigators@gmail.com';
    settings.email.fromName = 'Forex Navigators';
    settings.email.isMockMode = false;

    await settings.save();

    console.log('✅ SMTP credentials updated successfully!\n');
    console.log('=== Updated Email Configuration ===');
    console.log('SMTP Host:', settings.email.smtpHost);
    console.log('SMTP Port:', settings.email.smtpPort);
    console.log('SMTP User:', settings.email.smtpUser);
    console.log('SMTP Password:', settings.email.smtpPassword ? '***SET***' : 'NOT SET');
    console.log('From Email:', settings.email.fromEmail);
    console.log('From Name:', settings.email.fromName);
    console.log('Mock Mode:', settings.email.isMockMode);
    console.log('');

    // Test the configuration
    console.log('⚠️  Note: Make sure to update "fromEmail" to your actual Gmail address');
    console.log('⚠️  The app password should be used for authentication\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating SMTP credentials:', error);
    process.exit(1);
  }
}

updateSMTPCredentials();
