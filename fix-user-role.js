// Script to fix user role for testing123@gmail.com
async function fixUserRole() {
  try {
    console.log('=== FIXING USER ROLE FOR testing123@gmail.com ===');
    
    // Step 1: Login as admin
    console.log('\n1. Logging in as admin...');
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

    // Step 2: Find the user ID
    console.log('\n2. Finding user ID...');
    const usersResponse = await fetch('http://localhost:4000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!usersResponse.ok) {
      console.log('❌ Failed to get users');
      return;
    }

    const usersData = await usersResponse.json();
    const testingUser = usersData.find((user) => user.email === 'testing123@gmail.com');
    
    if (!testingUser) {
      console.log('❌ User testing123@gmail.com not found');
      return;
    }

    console.log('✅ Found user:', testingUser.email, 'ID:', testingUser._id);
    console.log('Current role:', testingUser.role);

    // Step 3: Update user role to admin
    console.log('\n3. Updating user role to admin...');
    const updateResponse = await fetch(`http://localhost:4000/api/admin/users/${testingUser._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'admin'
      })
    });

    if (updateResponse.ok) {
      console.log('✅ User role updated successfully');
      
      // Step 4: Verify the change
      console.log('\n4. Verifying the change...');
      const verifyResponse = await fetch('http://localhost:4000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updatedUser = verifyData.find((user) => user.email === 'testing123@gmail.com');
        if (updatedUser) {
          console.log('✅ Verification successful');
          console.log('New role:', updatedUser.role);
        }
      }
    } else {
      const error = await updateResponse.json();
      console.log('❌ Failed to update user role:', error);
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('testing123@gmail.com should now have admin role');

  } catch (error) {
    console.error('Fix error:', error);
  }
}

// Run the fix
fixUserRole();
