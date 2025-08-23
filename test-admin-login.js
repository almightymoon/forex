const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function testAdminLogin() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Test finding user by email
    console.log('\n1. Testing findByEmail...');
    const user1 = await User.findByEmail('admin@forexnavi.com');
    console.log('Found user1:', user1 ? 'Yes' : 'No');

    // Test finding user directly
    console.log('\n2. Testing direct findOne...');
    const user2 = await User.findOne({ email: 'admin@forexnavi.com' });
    console.log('Found user2:', user2 ? 'Yes' : 'No');

    if (user2) {
      console.log('User details:', {
        email: user2.email,
        role: user2.role,
        isActive: user2.isActive,
        isVerified: user2.isVerified,
        hasPassword: !!user2.password
      });

      // Test password comparison
      console.log('\n3. Testing password comparison...');
      const isPasswordCorrect = await user2.comparePassword('admin123');
      console.log('Password correct:', isPasswordCorrect);

      // Test bcrypt directly
      console.log('\n4. Testing bcrypt directly...');
      const directCompare = await bcrypt.compare('admin123', user2.password);
      console.log('Direct bcrypt compare:', directCompare);
    }
    
  } catch (error) {
    console.error('Error testing admin login:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

testAdminLogin();
