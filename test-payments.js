#!/usr/bin/env node

/**
 * Payment Integration Test Script
 * Tests all payment methods: Stripe, JazzCash, and EasyPaisa
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:3000';

// Test data
const testPaymentData = {
  amount: 100,
  currency: 'USD',
  description: 'Test payment',
  customerEmail: 'test@example.com',
  customerPhone: '03001234567',
  customerName: 'Test User'
};

async function testPaymentMethods() {
  console.log('🧪 Testing Payment Integration...\n');

  // Test 1: Get available payment methods
  console.log('Test 1: Fetching available payment methods');
  try {
    const response = await axios.get(`${BASE_URL}/api/payments/methods`);
    console.log('✅ Available payment methods:', response.data.methods.map(m => m.name).join(', '));
  } catch (error) {
    console.log('❌ Failed to fetch payment methods:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Test Stripe payment processing
  console.log('Test 2: Testing Stripe payment processing');
  try {
    const stripeData = {
      ...testPaymentData,
      paymentMethod: 'stripe'
    };

    const response = await axios.post(`${BASE_URL}/api/payments/process`, stripeData, {
      headers: {
        'Authorization': 'Bearer test-token', // In real test, use valid JWT
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Stripe payment processed successfully');
      console.log('   Transaction ID:', response.data.data.transactionId);
      console.log('   Client Secret:', response.data.data.clientSecret ? 'Present' : 'Not present');
    } else {
      console.log('❌ Stripe payment failed:', response.data.error);
    }
  } catch (error) {
    console.log('❌ Stripe payment test failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Test JazzCash payment processing
  console.log('Test 3: Testing JazzCash payment processing');
  try {
    const jazzcashData = {
      ...testPaymentData,
      paymentMethod: 'jazzcash',
      currency: 'PKR'
    };

    const response = await axios.post(`${BASE_URL}/api/payments/process`, jazzcashData, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ JazzCash payment processed successfully');
      console.log('   Transaction ID:', response.data.data.transactionId);
      console.log('   Redirect URL:', response.data.data.redirectUrl ? 'Present' : 'Not present');
    } else {
      console.log('❌ JazzCash payment failed:', response.data.error);
    }
  } catch (error) {
    console.log('❌ JazzCash payment test failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Test EasyPaisa payment processing
  console.log('Test 4: Testing EasyPaisa payment processing');
  try {
    const easypaisaData = {
      ...testPaymentData,
      paymentMethod: 'easypaisa',
      currency: 'PKR'
    };

    const response = await axios.post(`${BASE_URL}/api/payments/process`, easypaisaData, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ EasyPaisa payment processed successfully');
      console.log('   Transaction ID:', response.data.data.transactionId);
      console.log('   Redirect URL:', response.data.data.redirectUrl ? 'Present' : 'Not present');
    } else {
      console.log('❌ EasyPaisa payment failed:', response.data.error);
    }
  } catch (error) {
    console.log('❌ EasyPaisa payment test failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Test webhook endpoints
  console.log('Test 5: Testing webhook endpoints');
  
  // Test JazzCash webhook
  try {
    const jazzcashWebhookData = {
      pp_TxnRefNo: 'TEST123',
      pp_ResponseCode: '000',
      pp_ResponseMessage: 'Success',
      pp_Amount: '10000',
      pp_SecureHash: 'test_hash'
    };

    const response = await axios.post(`${BASE_URL}/api/payments/jazzcash/webhook`, jazzcashWebhookData);
    console.log('✅ JazzCash webhook endpoint accessible');
  } catch (error) {
    console.log('❌ JazzCash webhook test failed:', error.response?.data?.error || error.message);
  }

  // Test EasyPaisa webhook
  try {
    const easypaisaWebhookData = {
      orderId: 'TEST123',
      transactionReferenceNumber: 'TEST123',
      transactionAmount: '10000',
      transactionStatus: 'Success',
      hashKey: 'test_hash'
    };

    const response = await axios.post(`${BASE_URL}/api/payments/easypaisa/webhook`, easypaisaWebhookData);
    console.log('✅ EasyPaisa webhook endpoint accessible');
  } catch (error) {
    console.log('❌ EasyPaisa webhook test failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Test frontend payment page
  console.log('Test 6: Testing frontend payment page');
  try {
    const response = await axios.get(`${FRONTEND_URL}/payment`);
    if (response.status === 200) {
      console.log('✅ Frontend payment page accessible');
    } else {
      console.log('❌ Frontend payment page returned status:', response.status);
    }
  } catch (error) {
    console.log('❌ Frontend payment page test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
  console.log('🏁 Payment integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Set up environment variables with real API keys');
  console.log('2. Test with real payment data');
  console.log('3. Verify webhook endpoints are accessible from payment providers');
  console.log('4. Test payment flows end-to-end');
}

// Run the test
testPaymentMethods().catch(console.error);



