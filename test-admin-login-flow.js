const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testAdminLogin() {
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

    console.log('\n=== ADMIN USER DETAILS ===');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Active:', adminUser.isActive);
    console.log('Verified:', adminUser.isVerified);
    console.log('Last Login:', adminUser.lastLogin);

    // Test the login API
    console.log('\n=== TESTING LOGIN API ===');
    const loginData = {
      email: 'admin@forexnavi.com',
      password: 'admin123'
    };

    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();
    console.log('Login Response Status:', response.status);
    console.log('Login Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n=== LOGIN SUCCESS ===');
      console.log('User Role:', data.user.role);
      console.log('Token:', data.token ? 'Present' : 'Missing');
      
      if (data.user.role === 'admin') {
        console.log('✅ Admin user should be redirected to /admin');
      } else {
        console.log('❌ User role is not admin:', data.user.role);
      }
    } else {
      console.log('\n=== LOGIN FAILED ===');
      console.log('Error:', data.error);
      console.log('Message:', data.message);
    }

    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error testing admin login:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testAdminLogin();
