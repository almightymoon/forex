const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@forexnavigators.com';
const NEW_PASSWORD = 'admin123';

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the admin user
    console.log(`Looking for user with email: ${ADMIN_EMAIL}`);
    const adminUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (!adminUser) {
      console.error(`❌ User with email ${ADMIN_EMAIL} not found!`);
      console.log('Available admin users:');
      const admins = await User.find({ role: 'admin' }).select('email firstName lastName');
      if (admins.length === 0) {
        console.log('  No admin users found in database');
      } else {
        admins.forEach(admin => {
          console.log(`  - ${admin.email} (${admin.firstName} ${admin.lastName})`);
        });
      }
      process.exit(1);
    }

    console.log(`✅ Found user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Active: ${adminUser.isActive}`);

    // Update password (will be automatically hashed by pre-save hook)
    adminUser.password = NEW_PASSWORD;
    
    // Also unlock the account and reset failed login attempts
    if (adminUser.security) {
      adminUser.security.isLocked = false;
      adminUser.security.lockedUntil = null;
      adminUser.security.lockReason = null;
      adminUser.security.failedLoginAttempts = 0;
      adminUser.security.lastFailedLogin = null;
    }
    
    // Ensure user is active and verified
    adminUser.isActive = true;
    adminUser.isVerified = true;

    // Save the user (password will be hashed automatically)
    await adminUser.save();
    
    console.log(`✅ Password successfully reset to: ${NEW_PASSWORD}`);
    console.log(`✅ Account unlocked and activated`);
    console.log('\nYou can now login with:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
resetAdminPassword();

