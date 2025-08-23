const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Debug notifications router is working!' });
});

// Test config route
router.get('/test-config', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Debug test config route is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
