#!/usr/bin/env node

/**
 * Cron job script to process scheduled notifications
 * This script should be run every minute to check for scheduled notifications
 * 
 * Usage:
 * - Add to crontab: * * * * * /path/to/node /path/to/process-scheduled-notifications.js
 * - Or run manually: node process-scheduled-notifications.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // You'll need to set this

async function processScheduledNotifications() {
  try {
    console.log(`[${new Date().toISOString()}] Processing scheduled notifications...`);
    
    if (!ADMIN_TOKEN) {
      console.error('ADMIN_TOKEN environment variable is required');
      process.exit(1);
    }

    const response = await axios.post(`${API_BASE_URL}/api/notifications/process-scheduled`, {}, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    const results = response.data.results;
    console.log(`[${new Date().toISOString()}] Processed ${results.processed} notifications: ${results.successful} successful, ${results.failed} failed`);
    
    if (results.failed > 0) {
      console.warn(`[${new Date().toISOString()}] Warning: ${results.failed} notifications failed to process`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing scheduled notifications:`, error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the function
processScheduledNotifications();

