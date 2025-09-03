// Test script to check user role for testing123@gmail.com
async function testUserRole() {
  try {
    console.log('=== TESTING USER ROLE FOR testing123@gmail.com ===');
    
    // Step 1: Login as admin first to check the database
    console.log('\n1. Logging in as admin to check database...');
    const adminLoginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@forexnavi.com',
        password: 'admin123'
      })
    });

    const adminLoginData = await adminLoginResponse.json();
    if (!adminLoginResponse.ok) {
      console.log('❌ Admin login failed:', adminLoginData);
      return;
    }

    console.log('✅ Admin login successful');
    const adminToken = adminLoginData.token;

    // Step 2: Check all users in database
    console.log('\n2. Checking all users in database...');
    const usersResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ All users in database:');
      usersData.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
      });
      
      const testingUser = usersData.find((user) => user.email === 'testing123@gmail.com');
      if (testingUser) {
        console.log('\n✅ Found testing123@gmail.com in database:', testingUser);
        console.log('Role:', testingUser.role);
        console.log('Active:', testingUser.isActive);
      } else {
        console.log('\n❌ testing123@gmail.com not found in database');
      }
    } else {
      const error = await usersResponse.json();
      console.log('❌ Failed to get users:', error);
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Check the user list above to see the correct role and if the user exists');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testUserRole();
