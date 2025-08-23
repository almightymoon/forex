const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdminProperly() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@forexnavi.com' });
    console.log('Deleted existing admin user');

    // Create admin user with plain text password
    // The pre-save hook will hash it automatically
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@forexnavi.com',
      password: 'admin123', // Plain text - will be hashed by pre-save hook
      phone: '+1234567890',
      country: 'US',
      role: 'admin',
      isActive: true,
      isVerified: true,
      subscription: {
        plan: 'premium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
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

    // Test the password immediately
    const testUser = await User.findOne({ email: 'admin@forexnavi.com' });
    const isPasswordCorrect = await testUser.comparePassword('admin123');
    console.log('Password test result:', isPasswordCorrect);

    if (isPasswordCorrect) {
      console.log('✅ Admin login is working!');
    } else {
      console.log('❌ Admin login still not working');
    }

    console.log('\nAdmin credentials:');
    console.log('Email: admin@forexnavi.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createAdminProperly();
