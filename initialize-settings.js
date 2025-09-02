// Initialize Settings Script
// Run this to ensure settings are properly initialized in the database

const mongoose = require('mongoose');
const Settings = require('./models/Settings');
require('dotenv').config();

async function initializeSettings() {
  try {
    console.log('🔧 Initializing settings...');
    
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get or create settings
    let settings = await Settings.findOne();
    if (!settings) {
      console.log('📝 Creating new settings document...');
      settings = await Settings.create({});
      console.log('✅ Settings created successfully');
    } else {
      console.log('✅ Settings already exist');
    }
    
    console.log('📊 Current settings:', {
      platformName: settings.platformName,
      description: settings.description,
      defaultCurrency: settings.defaultCurrency,
      timezone: settings.timezone,
      maintenanceMode: settings.maintenanceMode
    });
    
    console.log('✅ Settings initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing settings:', error);
    process.exit(1);
  }
}

initializeSettings();
