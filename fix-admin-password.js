const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@forexnavi.com' });
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    console.log('Found admin user:', {
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      isVerified: adminUser.isVerified
    });

    // Hash new password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Update password
    adminUser.password = hashedPassword;
    adminUser.isActive = true;
    adminUser.isVerified = true;
    await adminUser.save();

    console.log('Admin password updated successfully!');
    console.log('Email: admin@forexnavi.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error fixing admin password:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixAdminPassword();
