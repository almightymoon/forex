#!/usr/bin/env node

/**
 * Admin Dashboard Data Loading Test
 * Tests if admin dashboard loads data without requiring refresh
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';

async function testAdminDashboardLoading() {
  console.log('🧪 Testing Admin Dashboard Data Loading...\n');

  // Test 1: Check if admin page loads
  console.log('Test 1: Checking admin page accessibility');
  try {
    const response = await axios.get(`${FRONTEND_URL}/admin`, {
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      },
      maxRedirects: 0
    });
    
    if (response.status === 200) {
      console.log('✅ Admin page loads successfully');
    } else if (response.status === 302 || response.status === 301) {
      console.log('ℹ️  Admin page redirects (expected for unauthenticated users)');
      console.log('   Redirect location:', response.headers.location);
    } else {
      console.log('ℹ️  Admin page status:', response.status);
    }
  } catch (error) {
    if (error.response?.status === 302 || error.response?.status === 301) {
      console.log('ℹ️  Admin page redirects (expected for unauthenticated users)');
      console.log('   Redirect location:', error.response.headers.location);
    } else {
      console.log('❌ Error accessing admin page:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  console.log('🏁 Admin dashboard loading test completed!');
  console.log('\nTo test the fix:');
  console.log('1. Login as admin user');
  console.log('2. Navigate to /admin');
  console.log('3. Check if data loads immediately without refresh');
  console.log('4. Check browser console for these messages:');
  console.log('   - "AdminContext - Admin page detected, initializing data..."');
  console.log('   - "AdminContext - Admin data initialized successfully"');
  console.log('   - "AdminDashboard - No data found, triggering refresh..." (if needed)');
  console.log('\nIf you still need to refresh, check:');
  console.log('1. Browser console for errors');
  console.log('2. Network tab for failed API calls');
  console.log('3. Backend server is running');
}

// Run the test
testAdminDashboardLoading().catch(console.error);


