// Add this to your browser console after logging in as admin
// This will help debug what's happening with the user data

console.log('=== ADMIN LOGIN DEBUG ===');
console.log('Token:', localStorage.getItem('token'));
console.log('User data:', localStorage.getItem('user'));

try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Parsed user data:', userData);
  console.log('User role:', userData.role);
  console.log('User email:', userData.email);
  
  if (userData.role === 'admin') {
    console.log('✅ User role is admin - should go to /admin');
  } else {
    console.log('❌ User role is NOT admin:', userData.role);
    console.log('This is why you\'re being redirected to student dashboard');
  }
} catch (error) {
  console.log('❌ Error parsing user data:', error);
}

console.log('Current URL:', window.location.href);
console.log('Expected URL for admin:', 'http://localhost:3000/admin');
console.log('========================');


