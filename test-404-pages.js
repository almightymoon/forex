#!/usr/bin/env node

/**
 * 404 Error Pages Test
 * Tests unauthorized access to teacher/admin routes
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';

async function test404Pages() {
  console.log('🧪 Testing 404 Error Pages for Unauthorized Access...\n');

  // Test 1: Access teacher route without authentication
  console.log('Test 1: Accessing /teacher without authentication');
  try {
    const response = await axios.get(`${FRONTEND_URL}/teacher`, {
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      },
      maxRedirects: 0
    });
    
    if (response.status === 302 || response.status === 301) {
      console.log('✅ Redirected to login (expected)');
      console.log('   Redirect location:', response.headers.location);
    } else {
      console.log('ℹ️  Status:', response.status);
    }
  } catch (error) {
    if (error.response?.status === 302 || error.response?.status === 301) {
      console.log('✅ Redirected to login (expected)');
      console.log('   Redirect location:', error.response.headers.location);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Access admin route without authentication
  console.log('Test 2: Accessing /admin without authentication');
  try {
    const response = await axios.get(`${FRONTEND_URL}/admin`, {
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      },
      maxRedirects: 0
    });
    
    if (response.status === 302 || response.status === 301) {
      console.log('✅ Redirected to login (expected)');
      console.log('   Redirect location:', response.headers.location);
    } else {
      console.log('ℹ️  Status:', response.status);
    }
  } catch (error) {
    if (error.response?.status === 302 || error.response?.status === 301) {
      console.log('✅ Redirected to login (expected)');
      console.log('   Redirect location:', error.response.headers.location);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Access teacher 404 page directly
  console.log('Test 3: Accessing teacher 404 page directly');
  try {
    const response = await axios.get(`${FRONTEND_URL}/teacher/not-found`);
    if (response.status === 200) {
      console.log('✅ Teacher 404 page accessible');
      if (response.data.includes('Teacher Access Required')) {
        console.log('✅ Correct error message displayed');
      } else {
        console.log('ℹ️  Different content than expected');
      }
    } else {
      console.log('❌ Teacher 404 page returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Teacher 404 page test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Access admin 404 page directly
  console.log('Test 4: Accessing admin 404 page directly');
  try {
    const response = await axios.get(`${FRONTEND_URL}/admin/not-found`);
    if (response.status === 200) {
      console.log('✅ Admin 404 page accessible');
      if (response.data.includes('Admin Access Required')) {
        console.log('✅ Correct error message displayed');
      } else {
        console.log('ℹ️  Different content than expected');
      }
    } else {
      console.log('❌ Admin 404 page returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Admin 404 page test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Access general 404 page
  console.log('Test 5: Accessing general 404 page');
  try {
    const response = await axios.get(`${FRONTEND_URL}/not-found`);
    if (response.status === 200) {
      console.log('✅ General 404 page accessible');
      if (response.data.includes('Access Denied')) {
        console.log('✅ Correct error message displayed');
      } else {
        console.log('ℹ️  Different content than expected');
      }
    } else {
      console.log('❌ General 404 page returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ General 404 page test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 404 Error Pages test completed!');
  console.log('\nNext steps:');
  console.log('1. Test with different user roles (student, teacher, admin)');
  console.log('2. Verify middleware redirects work correctly');
  console.log('3. Test client-side layout redirects');
  console.log('4. Verify 404 pages display correctly in browser');
}

// Run the test
test404Pages().catch(console.error);



