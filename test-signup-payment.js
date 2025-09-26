#!/usr/bin/env node

/**
 * Signup Payment Integration Test
 * Tests the signup flow with payment integration
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:4000';

async function testSignupPaymentFlow() {
  console.log('🧪 Testing Signup Payment Integration...\n');

  // Test 1: Test signup with credit card payment
  console.log('Test 1: Testing signup with credit card payment');
  try {
    const signupData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '03001234567',
      country: 'Pakistan',
      paymentMethod: 'credit_card',
      promoCode: '',
      signupFee: 30
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, signupData);
    
    if (response.data.success) {
      console.log('✅ User registration successful');
      console.log('   User ID:', response.data.user._id);
      console.log('   Token:', response.data.token ? 'Present' : 'Not present');
      
      if (response.data.requiresPayment) {
        console.log('✅ Payment required - integration working');
      } else {
        console.log('ℹ️  No payment required (free signup)');
      }
    } else {
      console.log('❌ User registration failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Signup test failed:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Test signup with JazzCash payment
  console.log('Test 2: Testing signup with JazzCash payment');
  try {
    const signupData = {
      firstName: 'Jazz',
      lastName: 'Cash',
      email: 'jazzcash@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '03001234567',
      country: 'Pakistan',
      paymentMethod: 'jazz_cash',
      promoCode: '',
      signupFee: 30
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, signupData);
    
    if (response.data.success) {
      console.log('✅ User registration successful');
      console.log('   Payment method: JazzCash');
      
      if (response.data.requiresPayment) {
        console.log('✅ Payment required - JazzCash integration working');
      }
    } else {
      console.log('❌ User registration failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ JazzCash signup test failed:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Test signup with EasyPaisa payment
  console.log('Test 3: Testing signup with EasyPaisa payment');
  try {
    const signupData = {
      firstName: 'Easy',
      lastName: 'Paisa',
      email: 'easypaisa@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '03451234567',
      country: 'Pakistan',
      paymentMethod: 'easypaisa',
      promoCode: '',
      signupFee: 30
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, signupData);
    
    if (response.data.success) {
      console.log('✅ User registration successful');
      console.log('   Payment method: EasyPaisa');
      
      if (response.data.requiresPayment) {
        console.log('✅ Payment required - EasyPaisa integration working');
      }
    } else {
      console.log('❌ User registration failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ EasyPaisa signup test failed:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Test signup with promo code (free)
  console.log('Test 4: Testing signup with promo code (free registration)');
  try {
    const signupData = {
      firstName: 'Free',
      lastName: 'User',
      email: 'freeuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: '03001234567',
      country: 'Pakistan',
      paymentMethod: 'credit_card',
      promoCode: 'FREESIGNUP',
      signupFee: 0 // Free with promo code
    };

    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, signupData);
    
    if (response.data.success) {
      console.log('✅ Free user registration successful');
      console.log('   Promo code applied');
      
      if (!response.data.requiresPayment) {
        console.log('✅ No payment required - promo code working');
      }
    } else {
      console.log('❌ Free user registration failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Free signup test failed:', error.response?.data?.message || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Test frontend signup page accessibility
  console.log('Test 5: Testing frontend signup page');
  try {
    const response = await axios.get(`${FRONTEND_URL}/register`);
    if (response.status === 200) {
      console.log('✅ Frontend signup page accessible');
    } else {
      console.log('❌ Frontend signup page returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Frontend signup page test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Signup payment integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Test the signup flow in the browser');
  console.log('2. Verify payment modal appears correctly');
  console.log('3. Test payment processing with real credentials');
  console.log('4. Verify redirects work properly');
}

// Run the test
testSignupPaymentFlow().catch(console.error);



