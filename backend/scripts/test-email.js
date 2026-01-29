/**
 * Test Email SMTP Configuration
 * Run with: node scripts/test-email.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const NotificationService = require('../services/notificationService');

async function testEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://moon:947131@cluster0.gvga3.mongodb.net/';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get settings
    const settings = await Settings.getSettings();
    const emailConfig = settings.email;

    console.log('=== Email Configuration ===');
    console.log('SMTP Host:', emailConfig.smtpHost || 'NOT SET');
    console.log('SMTP Port:', emailConfig.smtpPort || 'NOT SET');
    console.log('SMTP User:', emailConfig.smtpUser || 'NOT SET');
    console.log('SMTP Password:', emailConfig.smtpPassword ? '***SET***' : 'NOT SET');
    console.log('From Email:', emailConfig.fromEmail || 'NOT SET');
    console.log('From Name:', emailConfig.fromName || 'NOT SET');
    console.log('Mock Mode:', emailConfig.isMockMode ? 'ENABLED (emails will be logged only)' : 'DISABLED');
    console.log('');

    // Check if configuration is complete
    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
      console.log('❌ Email configuration is INCOMPLETE');
      console.log('Missing fields:');
      if (!emailConfig.smtpHost) console.log('  - SMTP Host');
      if (!emailConfig.smtpUser) console.log('  - SMTP User');
      if (!emailConfig.smtpPassword) console.log('  - SMTP Password');
      console.log('\nTo configure email, update the Settings in the admin panel or database.');
      process.exit(1);
    }

    // Test email configuration
    console.log('=== Testing Email Configuration ===');
    const notificationService = require('../services/notificationService');
    const testResult = await notificationService.testEmailConfiguration();

    if (testResult.success) {
      console.log('✅ Email configuration is VALID');
      console.log('Message:', testResult.message);
      console.log('\nYou can now send emails through the platform.');
    } else {
      console.log('❌ Email configuration test FAILED');
      console.log('Error:', testResult.error);
      console.log('\nPlease check your SMTP settings and try again.');
    }

    // Optionally send a test email
    if (process.argv.includes('--send-test')) {
      const testEmail = process.argv[process.argv.indexOf('--send-test') + 1];
      if (!testEmail || !testEmail.includes('@')) {
        console.log('\n⚠️  To send a test email, use: node scripts/test-email.js --send-test your@email.com');
      } else {
        console.log(`\n=== Sending Test Email to ${testEmail} ===`);
        const sent = await notificationService.sendEmail({
          to: testEmail,
          subject: 'Test Email - Forex Navigators',
          html: `
            <h2>Email Configuration Test</h2>
            <p>This is a test email from your Forex Navigators platform.</p>
            <p>If you're receiving this, your email configuration is working correctly!</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          `,
          text: 'This is a test email from Forex Navigators. Your email configuration is working correctly!'
        });

        if (sent) {
          console.log('✅ Test email sent successfully!');
        } else {
          console.log('❌ Failed to send test email');
        }
      }
    }

    await mongoose.disconnect();
    process.exit(testResult.success ? 0 : 1);

  } catch (error) {
    console.error('Error testing email:', error);
    process.exit(1);
  }
}

testEmail();
