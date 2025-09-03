// Test script to verify admin login for testing123@gmail.com
async function testAdminLogin() {
  try {
    console.log('=== TESTING ADMIN LOGIN FOR testing123@gmail.com ===');
    
    // Step 1: Login with testing123@gmail.com
    console.log('\n1. Logging in with testing123@gmail.com...');
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testing123@gmail.com',
        password: 'testing123'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Login successful');
    console.log('Login response:', loginData);
    console.log('User role from login:', loginData.user?.role);

    const token = loginData.token;

    // Step 2: Test /api/auth/me endpoint
    console.log('\n2. Testing /api/auth/me endpoint...');
    const meResponse = await fetch('http://localhost:4000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('✅ /api/auth/me response:', meData);
      console.log('User role from /me:', meData.user?.role);
    } else {
      const error = await meResponse.json();
      console.log('❌ /api/auth/me failed:', error);
    }

    // Step 3: Test admin access
    console.log('\n3. Testing admin access...');
    const adminResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (adminResponse.ok) {
      console.log('✅ Admin access successful');
      const adminData = await adminResponse.json();
      console.log('Number of users:', adminData.length);
    } else {
      const error = await adminResponse.json();
      console.log('❌ Admin access failed:', error);
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('testing123@gmail.com should now login as admin and have admin access');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testAdminLogin();
