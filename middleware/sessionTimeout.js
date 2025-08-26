const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');
const User = require('../models/User');

const checkSessionTimeout = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // No token, let other middleware handle
    }
    
    // Decode token to get expiration
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get current settings for session timeout
    const settings = await Settings.getSettings();
    const sessionTimeoutMinutes = settings.security.sessionTimeout;
    const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;
    
    // Check if token is close to expiration based on settings
    const now = Date.now() / 1000; // Convert to seconds
    const timeUntilExpiry = decoded.exp - now;
    const sessionStartTime = decoded.iat;
    const sessionAge = now - sessionStartTime;
    
    // If session is older than configured timeout, force re-authentication
    if (sessionAge > sessionTimeoutMinutes * 60) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Your session has expired due to inactivity. Please log in again.',
        sessionExpired: true
      });
    }
    
    // If token expires in less than 10 minutes, suggest refresh
    if (timeUntilExpiry < 600) { // 10 minutes
      res.set('X-Token-Refresh-Suggested', 'true');
      res.set('X-Token-Expires-In', Math.floor(timeUntilExpiry));
    }
    
    next();
  } catch (error) {
    console.error('Session timeout check error:', error);
    next(); // Continue on error, let other auth middleware handle
  }
};

const generateTokenWithTimeout = (userId, role) => {
  return new Promise(async (resolve, reject) => {
    try {
      const settings = await Settings.getSettings();
      const sessionTimeoutMinutes = settings.security.sessionTimeout;
      
      // Create token with appropriate expiration and role
      const token = jwt.sign(
        { userId, role, sessionStart: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: `${sessionTimeoutMinutes}m` }
      );
      
      resolve(token);
    } catch (error) {
      // Fallback to default 7 days if settings unavailable
      const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      resolve(token);
    }
  });
};

const refreshToken = async (oldToken) => {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    const settings = await Settings.getSettings();
    const sessionTimeoutMinutes = settings.security.sessionTimeout;
    
    // Generate new token with fresh expiration and preserve role
    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role, sessionStart: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionTimeoutMinutes}m` }
    );
    
    return { token: newToken, success: true };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
};

module.exports = {
  checkSessionTimeout,
  generateTokenWithTimeout,
  refreshToken
};
