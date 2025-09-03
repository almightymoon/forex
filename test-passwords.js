// Test script to try different passwords for testing123@gmail.com
async function testPasswords() {
  try {
    console.log('=== TESTING PASSWORDS FOR testing123@gmail.com ===');
    
    const passwords = [
      'testing123',
      'password',
      '123456',
      'admin123',
      'test123',
      'testing',
      'password123',
      'admin',
      'user123',
      'test'
    ];

    for (const password of passwords) {
      console.log(`\nTrying password: ${password}`);
      
      const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'testing123@gmail.com',
          password: password
        })
      });

      const loginData = await loginResponse.json();
      if (loginResponse.ok) {
        console.log('✅ SUCCESS! Password found:', password);
        console.log('Login response:', loginData);
        console.log('User role:', loginData.user?.role);
        return;
      } else {
        console.log('❌ Failed with password:', password);
      }
    }

    console.log('\n❌ None of the common passwords worked');
    console.log('You may need to reset the password or check the user creation process');

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testPasswords();
