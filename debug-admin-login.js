#!/usr/bin/env node

/**
 * Admin Login Debug Script
 * Helps debug why admin users are redirected to student dashboard
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

async function debugAdminLogin() {
  console.log('🔍 Debugging Admin Login Issue...\n');

  // Test 1: Check what the backend returns for admin login
  console.log('Test 1: Testing admin login with backend');
  try {
    const loginData = {
      email: 'admin@example.com', // Change this to your actual admin email
      password: 'admin123' // Change this to your actual admin password
    };

    console.log('Attempting login with:', loginData.email);
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, loginData);
    
    if (response.data.success) {
      console.log('✅ Backend login successful');
      console.log('   User data:', JSON.stringify(response.data.user, null, 2));
      console.log('   User role:', response.data.user.role);
      console.log('   User email:', response.data.user.email);
      console.log('   Token present:', response.data.token ? 'Yes' : 'No');
      
      if (response.data.user.role === 'admin') {
        console.log('✅ Backend confirms user has admin role');
      } else {
        console.log('❌ Backend says user role is:', response.data.user.role);
        console.log('   This is the problem! The user is not actually an admin in the database.');
      }
    } else {
      console.log('❌ Backend login failed:', response.data.message);
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

  // Test 2: Check if there are any admin users in the database
  console.log('Test 2: Checking for admin users in database');
  try {
    // This would require a backend endpoint to list users
    console.log('ℹ️  To check admin users, you need to:');
    console.log('   1. Check your database directly');
    console.log('   2. Or create a backend endpoint to list users');
    console.log('   3. Or check the user registration process');
  } catch (error) {
    console.log('❌ Error checking users:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Admin login debug completed!');
  console.log('\nNext steps:');
  console.log('1. Check the browser console when you login');
  console.log('2. Check localStorage for the user data');
  console.log('3. Verify the user role in the database');
  console.log('4. Make sure you\'re using the correct admin credentials');
  console.log('\nTo check localStorage:');
  console.log('1. Open browser dev tools');
  console.log('2. Go to Application tab');
  console.log('3. Check localStorage for "user" and "token"');
  console.log('4. Look at the user object and check the role field');
}

// Run the debug
debugAdminLogin().catch(console.error);