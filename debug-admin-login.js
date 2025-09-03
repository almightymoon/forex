// Test script to simulate admin login and check what happens
async function testAdminLoginFlow() {
  try {
    console.log('=== TESTING ADMIN LOGIN FLOW ===');
    
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
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const token = loginData.token;
    const user = loginData.user;
    console.log('✅ Login successful');
    console.log('User role:', user.role);
    console.log('Token:', token ? 'Present' : 'Missing');

    // Step 2: Test /api/auth/me endpoint
    console.log('\n2. Testing /api/auth/me endpoint...');
    const meResponse = await fetch('http://localhost:4000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const meData = await meResponse.json();
    console.log('Me response status:', meResponse.status);
    console.log('Me response:', meData);

    if (!meResponse.ok) {
      console.log('❌ /api/auth/me failed');
      return;
    }

    console.log('✅ /api/auth/me successful');
    console.log('User role from /me:', meData.user.role);

    // Step 3: Test admin endpoint
    console.log('\n3. Testing admin endpoint...');
    const adminResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Admin response status:', adminResponse.status);
    
    if (adminResponse.ok) {
      console.log('✅ Admin endpoint accessible');
    } else {
      const adminError = await adminResponse.json();
      console.log('❌ Admin endpoint failed:', adminError);
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Expected behavior:');
    console.log('- Login should return admin role');
    console.log('- /api/auth/me should return admin role');
    console.log('- Admin endpoints should be accessible');
    console.log('- Frontend should redirect to /admin');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testAdminLoginFlow();
