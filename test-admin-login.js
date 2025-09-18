#!/usr/bin/env node

/**
 * Admin Login Debug Test
 * Tests admin login flow to identify issues
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

async function testAdminLogin() {
  console.log('🔍 Debugging Admin Login Issue...\n');

  // Test 1: Check if backend is running
  console.log('Test 1: Checking backend connectivity');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/auth/test`);
    console.log('✅ Backend is running');
  } catch (error) {
    console.log('❌ Backend is not running or not accessible');
    console.log('   Error:', error.message);
    console.log('   Please start the backend server first');
    return;
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Test admin login with backend
  console.log('Test 2: Testing admin login with backend');
  try {
    const loginData = {
      email: 'admin@example.com', // Change this to your admin email
      password: 'admin123' // Change this to your admin password
    };

    console.log('Attempting login with:', loginData.email);
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, loginData);
    
    if (response.data.success) {
      console.log('✅ Admin login successful');
      console.log('   User role:', response.data.user.role);
      console.log('   User email:', response.data.user.email);
      console.log('   Token present:', response.data.token ? 'Yes' : 'No');
      
      if (response.data.user.role === 'admin') {
        console.log('✅ User has admin role');
      } else {
        console.log('❌ User does not have admin role');
        console.log('   Expected: admin, Got:', response.data.user.role);
      }
    } else {
      console.log('❌ Admin login failed:', response.data.message);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Login request failed:', error.response.data.message || error.response.statusText);
      console.log('   Status:', error.response.status);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Check frontend login page
  console.log('Test 3: Checking frontend login page');
  try {
    const response = await axios.get(`${FRONTEND_URL}/login`);
    if (response.status === 200) {
      console.log('✅ Frontend login page accessible');
    } else {
      console.log('❌ Frontend login page not accessible, status:', response.status);
    }
  } catch (error) {
    console.log('❌ Frontend not accessible:', error.message);
    console.log('   Please start the frontend server first');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Check admin route accessibility
  console.log('Test 4: Checking admin route accessibility');
  try {
    const response = await axios.get(`${FRONTEND_URL}/admin`, {
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      },
      maxRedirects: 0
    });
    
    if (response.status === 200) {
      console.log('✅ Admin route accessible (user might be logged in)');
    } else if (response.status === 302 || response.status === 301) {
      console.log('ℹ️  Admin route redirects (expected for unauthenticated users)');
      console.log('   Redirect location:', response.headers.location);
    } else {
      console.log('ℹ️  Admin route status:', response.status);
    }
  } catch (error) {
    if (error.response?.status === 302 || error.response?.status === 301) {
      console.log('ℹ️  Admin route redirects (expected for unauthenticated users)');
      console.log('   Redirect location:', error.response.headers.location);
    } else {
      console.log('❌ Error accessing admin route:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Admin login debug completed!');
  console.log('\nNext steps:');
  console.log('1. Make sure you have an admin user in the database');
  console.log('2. Check the admin user credentials');
  console.log('3. Verify the admin user has role: "admin"');
  console.log('4. Test login in the browser');
  console.log('5. Check browser console for errors');
}

// Run the test
testAdminLogin().catch(console.error);