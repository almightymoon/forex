// Test script to debug admin login issues
// Run this in the browser console when you encounter the error

console.log('🔍 Admin Login Debug Script Started');

// Check environment variables
console.log('🌍 Environment Check:', {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://217.196.51.104:9090/api',
  NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development',
  userAgent: navigator.userAgent,
  location: window.location.href,
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  port: window.location.port
});

// Check localStorage
console.log('🔑 LocalStorage Check:', {
  token: localStorage.getItem('token') ? 'Present' : 'Missing',
  tokenLength: localStorage.getItem('token')?.length || 0
});

// Test API connectivity
async function testAPIConnectivity() {
  try {
    console.log('🌐 Testing API connectivity...');
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://217.196.51.104:9090/api';
    
    // Test basic connectivity
    const response = await fetch(apiUrl, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    console.log('✅ Basic API connectivity:', response);
    
    // Test auth endpoint
    const token = localStorage.getItem('token');
    if (token) {
      const authResponse = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('🔐 Auth endpoint test:', {
        status: authResponse.status,
        ok: authResponse.ok,
        statusText: authResponse.statusText
      });
      
      if (authResponse.ok) {
        const userData = await authResponse.json();
        console.log('👤 User data:', userData);
      } else {
        const errorText = await authResponse.text();
        console.log('❌ Auth error:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ API connectivity test failed:', error);
  }
}

// Test admin endpoints
async function testAdminEndpoints() {
  try {
    console.log('👑 Testing admin endpoints...');
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://217.196.51.104:9090/api';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('❌ No token available for admin endpoint test');
      return;
    }
    
    const endpoints = [
      'api/admin/users',
      'api/admin/payments',
      'api/admin/analytics',
      'api/admin/promocodes',
      'api/admin/settings'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${apiUrl}/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📊 ${endpoint}:`, {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ ${endpoint} error:`, errorText);
        }
      } catch (error) {
        console.error(`❌ ${endpoint} failed:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Admin endpoints test failed:', error);
  }
}

// Check for console errors
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  console.log('🔴 Console Error Detected:', args);
};

// Check for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  console.log('🔴 Unhandled Promise Rejection:', event.reason);
});

// Run tests
testAPIConnectivity().then(() => {
  testAdminEndpoints();
});

console.log('✅ Admin Login Debug Script Loaded - Check console for results');
