const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@forexnavi.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('Updated existing user to admin role');
      }
      console.log('Admin credentials:');
      console.log('Email: admin@forexnavi.com');
      console.log('Password: admin123');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@forexnavi.com',
      password: hashedPassword,
      phone: '+1234567890',
      country: 'US',
      role: 'admin',
      isActive: true,
      isVerified: true,
      subscription: {
        plan: 'premium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      profile: {
        bio: 'System Administrator',
        tradingExperience: 'expert',
        preferredMarkets: ['forex', 'crypto'],
        riskTolerance: 'high'
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@forexnavi.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createAdminUser();