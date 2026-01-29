/**
 * Setup SMTP Email Configuration
 * Usage: node scripts/setup-smtp.js [smtp-host] [smtp-port]
 * Examples:
 *   node scripts/setup-smtp.js smtp.gmail.com 587
 *   node scripts/setup-smtp.js smtp.sendgrid.net 587
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

async function setupSMTP() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://moon:947131@cluster0.gvga3.mongodb.net/';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get or create settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
      await settings.save();
    }

    // Get SMTP host from command line or use defaults
    const smtpHost = process.argv[2] || 'smtp.gmail.com';
    const smtpPort = parseInt(process.argv[3]) || 587;

    console.log('=== Current Email Configuration ===');
    console.log('SMTP Host:', settings.email.smtpHost || 'NOT SET');
    console.log('SMTP Port:', settings.email.smtpPort || 'NOT SET');
    console.log('SMTP User:', settings.email.smtpUser || 'NOT SET');
    console.log('SMTP Password:', settings.email.smtpPassword ? '***SET***' : 'NOT SET');
    console.log('From Email:', settings.email.fromEmail || 'NOT SET');
    console.log('From Name:', settings.email.fromName || 'NOT SET');
    console.log('');

    // Update SMTP host
    if (process.argv[2]) {
      settings.email.smtpHost = smtpHost;
      settings.email.smtpPort = smtpPort;
      await settings.save();
      console.log(`✅ Updated SMTP configuration:`);
      console.log(`   Host: ${smtpHost}`);
      console.log(`   Port: ${smtpPort}`);
      console.log('');
    } else {
      console.log('Usage: node scripts/setup-smtp.js [smtp-host] [smtp-port]');
      console.log('');
      console.log('Common SMTP providers:');
      console.log('  Gmail:        smtp.gmail.com 587');
      console.log('  SendGrid:     smtp.sendgrid.net 587');
      console.log('  Outlook:      smtp-mail.outlook.com 587');
      console.log('  Mailgun:      smtp.mailgun.org 587');
      console.log('  AWS SES:      email-smtp.us-east-1.amazonaws.com 587');
      console.log('');
      console.log('Example: node scripts/setup-smtp.js smtp.gmail.com 587');
    }

    // Show updated configuration
    await settings.save();
    const updatedSettings = await Settings.getSettings();
    console.log('=== Updated Email Configuration ===');
    console.log('SMTP Host:', updatedSettings.email.smtpHost || 'NOT SET');
    console.log('SMTP Port:', updatedSettings.email.smtpPort || 'NOT SET');
    console.log('SMTP User:', updatedSettings.email.smtpUser || 'NOT SET');
    console.log('SMTP Password:', updatedSettings.email.smtpPassword ? '***SET***' : 'NOT SET');
    console.log('From Email:', updatedSettings.email.fromEmail || 'NOT SET');
    console.log('From Name:', updatedSettings.email.fromName || 'NOT SET');
    console.log('');

    // Check if configuration is complete
    if (updatedSettings.email.smtpHost && 
        updatedSettings.email.smtpUser && 
        updatedSettings.email.smtpPassword) {
      console.log('✅ Email configuration is COMPLETE');
      console.log('');
      console.log('You can now test the email configuration:');
      console.log('  node scripts/test-email.js --send-test your@email.com');
    } else {
      console.log('⚠️  Email configuration is still INCOMPLETE');
      const missing = [];
      if (!updatedSettings.email.smtpHost) missing.push('SMTP Host');
      if (!updatedSettings.email.smtpUser) missing.push('SMTP User');
      if (!updatedSettings.email.smtpPassword) missing.push('SMTP Password');
      console.log('Missing:', missing.join(', '));
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error setting up SMTP:', error);
    process.exit(1);
  }
}

setupSMTP();
