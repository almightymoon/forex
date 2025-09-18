#!/usr/bin/env node

/**
 * Test script to verify the send-emails endpoint
 * This script tests if the /api/notifications/send-emails endpoint is accessible
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testSendEmailsEndpoint() {
  try {
    console.log('Testing /api/notifications/send-emails endpoint...');
    console.log('API Base URL:', API_BASE_URL);
    
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

    // Test the send-emails endpoint
    console.log('2. Testing /api/notifications/send-emails endpoint...');
    const sendEmailsResponse = await axios.post(`${API_BASE_URL}/api/notifications/send-emails`, {
      emails: ['test@example.com'],
      subject: 'Test Email',
      message: 'This is a test email from the API test script.',
      type: 'info'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✓ Send emails endpoint is working');
    console.log('Response:', sendEmailsResponse.data);

  } catch (error) {
    console.error('Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 404) {
        console.error('❌ Endpoint not found - the /api/notifications/send-emails route may not be properly registered');
      } else if (error.response.status === 401) {
        console.error('❌ Unauthorized - token may be invalid or expired');
      } else if (error.response.status === 500) {
        console.error('❌ Server error - there may be a syntax error in the route handler');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - server may not be running on', API_BASE_URL);
    }
  }
}

// Run the test
testSendEmailsEndpoint();

