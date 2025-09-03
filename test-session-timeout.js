const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

async function testSessionTimeout() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get current settings
    const settings = await Settings.getSettings();
    console.log('\n=== SESSION TIMEOUT SETTINGS ===');
    console.log(`Current session timeout: ${settings.security.sessionTimeout} minutes`);
    console.log(`Settings object:`, JSON.stringify(settings.security, null, 2));

    // Test updating session timeout
    console.log('\n=== TESTING SESSION TIMEOUT UPDATE ===');
    const newTimeout = 15; // 15 minutes
    settings.security.sessionTimeout = newTimeout;
    await settings.save();
    console.log(`Updated session timeout to: ${newTimeout} minutes`);

    // Verify the update
    const updatedSettings = await Settings.getSettings();
    console.log(`Verified timeout: ${updatedSettings.security.sessionTimeout} minutes`);

    console.log('\n=== SESSION TIMEOUT TEST COMPLETE ===');
    console.log('The session timeout should now be 15 minutes.');
    console.log('Users will be logged out after 15 minutes of inactivity.');
    
  } catch (error) {
    console.error('Error testing session timeout:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testSessionTimeout();
