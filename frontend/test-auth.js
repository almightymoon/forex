#!/usr/bin/env node

/**
 * Simple test script to verify teacher route authentication
 * Run this script to test if the authentication middleware is working correctly
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testTeacherRouteAccess() {
  console.log('🔒 Testing Teacher Route Authentication...\n');

  // Test 1: Access teacher route without token
  console.log('Test 1: Accessing /teacher without authentication token');
  try {
    const response = await fetch(`${BASE_URL}/teacher`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Script'
      },
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ PASS: Redirected to login page');
        console.log(`   Redirect URL: ${location}`);
      } else {
        console.log('❌ FAIL: Redirected to unexpected location');
        console.log(`   Redirect URL: ${location}`);
      }
    } else {
      console.log('❌ FAIL: Expected redirect, got status:', response.status);
    }
  } catch (error) {
    console.log('❌ FAIL: Error making request:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Access teacher route with invalid token
  console.log('Test 2: Accessing /teacher with invalid token');
  try {
    const response = await fetch(`${BASE_URL}/teacher`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'User-Agent': 'Test-Script'
      },
      redirect: 'manual'
    });
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ PASS: Redirected to login page with invalid token');
        console.log(`   Redirect URL: ${location}`);
      } else {
        console.log('❌ FAIL: Redirected to unexpected location');
        console.log(`   Redirect URL: ${location}`);
      }
    } else {
      console.log('❌ FAIL: Expected redirect, got status:', response.status);
    }
  } catch (error) {
    console.log('❌ FAIL: Error making request:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Access teacher route with expired token
  console.log('Test 3: Accessing /teacher with expired token');
  try {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwicm9sZSI6InRlYWNoZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid';
    const response = await fetch(`${BASE_URL}/teacher`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${expiredToken}`,
        'User-Agent': 'Test-Script'
      },
      redirect: 'manual'
    });
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ PASS: Redirected to login page with expired token');
        console.log(`   Redirect URL: ${location}`);
      } else {
        console.log('❌ FAIL: Redirected to unexpected location');
        console.log(`   Redirect URL: ${location}`);
      }
    } else {
      console.log('❌ FAIL: Expected redirect, got status:', response.status);
    }
  } catch (error) {
    console.log('❌ FAIL: Error making request:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Access public route (should work)
  console.log('Test 4: Accessing public route /login');
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Script'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ PASS: Public route accessible');
    } else {
      console.log('❌ FAIL: Public route not accessible, status:', response.status);
    }
  } catch (error) {
    console.log('❌ FAIL: Error making request:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Authentication test completed!');
  console.log('\nTo test with a valid token:');
  console.log('1. Login to the application');
  console.log('2. Open browser dev tools');
  console.log('3. Copy the token from localStorage');
  console.log('4. Use it in a curl command or Postman');
  console.log('\nExample:');
  console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" ${BASE_URL}/teacher`);
}

// Run the test
testTeacherRouteAccess().catch(console.error);

