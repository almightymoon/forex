const mongoose = require('mongoose');
const Settings = require('./models/Settings');

mongoose.connect('mongodb://localhost:27017/forex_navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkAndTestSmtp() {
  try {
    console.log('🔍 Checking current SMTP settings in database...\n');
    
    const settings = await Settings.getSettings();
    
    console.log('📊 Current SMTP Settings:');
    console.log('SMTP Host:', settings.email.smtpHost || '(NOT SET)');
    console.log('SMTP Port:', settings.email.smtpPort || '(NOT SET)');
    console.log('SMTP User:', settings.email.smtpUser || '(NOT SET)');
    console.log('SMTP Password:', settings.email.smtpPassword ? '***SET***' : '(NOT SET)');
    console.log('From Email:', settings.email.fromEmail || '(NOT SET)');
    console.log('From Name:', settings.email.fromName || '(NOT SET)');
    
    console.log('\n📋 Configuration Status:');
    const requiredFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword'];
    const missingFields = requiredFields.filter(field => !settings.email[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All required SMTP fields are configured');
    } else {
      console.log('❌ Missing required fields:', missingFields.join(', '));
    }

    // Test saving new SMTP settings
    console.log('\n🔄 Testing SMTP settings save...');
    
    const testSmtpSettings = {
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'atharqulimoon@gmail.com',
        smtpPassword: 'imtk elej lkiw fysd',
        fromEmail: 'noreply@forexnavigators.com',
        fromName: 'Forex Navigators'
      }
    };

    console.log('Saving test settings...');
    await Settings.updateSettings(testSmtpSettings);
    console.log('✅ Test settings saved to database');

    // Verify the save
    const updatedSettings = await Settings.getSettings();
    console.log('\n📊 Updated SMTP Settings:');
    console.log('SMTP Host:', updatedSettings.email.smtpHost);
    console.log('SMTP Port:', updatedSettings.email.smtpPort);
    console.log('SMTP User:', updatedSettings.email.smtpUser);
    console.log('SMTP Password:', updatedSettings.email.smtpPassword ? '***SET***' : '(NOT SET)');
    console.log('From Email:', updatedSettings.email.fromEmail);
    console.log('From Name:', updatedSettings.email.fromName);

    // Test notification service
    console.log('\n📧 Testing notification service...');
    const notificationService = require('./services/notificationService');
    
    const refreshSuccess = await notificationService.refreshEmailTransporter();
    console.log('Email Transporter Refresh:', refreshSuccess ? '✅ Success' : '❌ Failed');

    // Test email configuration
    const configTest = await notificationService.testEmailConfiguration();
    console.log('Configuration Test:', configTest.success ? '✅ Success' : '❌ Failed');
    if (!configTest.success) {
      console.log('Error:', configTest.error);
    }

    console.log('\n🎉 Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkAndTestSmtp(); 