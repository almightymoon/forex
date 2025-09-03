// Test script to verify admin dashboard loads without errors
async function testAdminDashboardLoad() {
  try {
    console.log('=== TESTING ADMIN DASHBOARD LOAD ===');
    
    // Step 1: Login as admin
    console.log('\n1. Logging in as admin...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@forexnavi.com',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Test admin settings endpoint
    console.log('\n2. Testing admin settings endpoint...');
    const settingsResponse = await fetch('http://localhost:4000/api/admin/settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      console.log('✅ Admin settings loaded successfully');
      console.log('Settings structure:', Object.keys(settingsData));
      console.log('Platform name:', settingsData.general?.platformName);
    } else {
      const error = await settingsResponse.json();
      console.log('❌ Admin settings failed:', error);
    }

    // Step 3: Test admin users endpoint
    console.log('\n3. Testing admin users endpoint...');
    const usersResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ Admin users loaded successfully');
      console.log('Users count:', usersData.length);
    } else {
      const error = await usersResponse.json();
      console.log('❌ Admin users failed:', error);
    }

    // Step 4: Test notifications endpoint
    console.log('\n4. Testing notifications endpoint...');
    const notificationsResponse = await fetch('http://localhost:4000/api/notifications/user?unreadOnly=true&limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (notificationsResponse.ok) {
      const notificationsData = await notificationsResponse.json();
      console.log('✅ Notifications loaded successfully');
      console.log('Unread count:', notificationsData.unreadCount);
    } else {
      const error = await notificationsResponse.json();
      console.log('❌ Notifications failed:', error);
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('All endpoints should be accessible for admin users');
    console.log('Frontend should now load without "platformName" errors');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testAdminDashboardLoad();
