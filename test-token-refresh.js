#!/usr/bin/env node

/**
 * Test script to verify token refresh functionality
 * This script tests the token refresh endpoint to ensure it's working correctly
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testTokenRefresh() {
  try {
    console.log('Testing token refresh functionality...');
    
    // First, try to login to get a token
    console.log('1. Attempting login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
    });

    if (!loginResponse.data.token) {
      console.error('Login failed - no token received');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✓ Login successful, token received');

    // Test token refresh
    console.log('2. Testing token refresh...');
    const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (refreshResponse.data.token) {
      console.log('✓ Token refresh successful');
      console.log('New token received:', refreshResponse.data.token.substring(0, 20) + '...');
    } else {
      console.error('✗ Token refresh failed - no new token received');
    }

    // Test using the new token
    console.log('3. Testing API call with refreshed token...');
    const testResponse = await axios.get(`${API_BASE_URL}/api/notifications/stats`, {
      headers: {
        'Authorization': `Bearer ${refreshResponse.data.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.status === 200) {
      console.log('✓ API call with refreshed token successful');
      console.log('Stats data received:', Object.keys(testResponse.data.stats || {}));
    } else {
      console.error('✗ API call with refreshed token failed');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTokenRefresh();

