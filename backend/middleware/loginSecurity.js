const Settings = require('../models/Settings');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// Track failed login attempts
const failedAttempts = new Map(); // In production, use Redis or database

const trackFailedLogin = async (email, ip) => {
  try {
    const settings = await Settings.getSettings();
    const maxAttempts = settings.security.loginAttempts;
    const lockDuration = settings.security.accountLockDuration * 60 * 1000; // Convert to milliseconds
    
    const key = `${email}:${ip}`;
    const now = Date.now();
    
    // Get current attempt data
    let attemptData = failedAttempts.get(key) || {
      attempts: 0,
      lockedUntil: null,
      firstAttempt: now
    };
    
    // Reset if lock duration has passed
    if (attemptData.lockedUntil && now > attemptData.lockedUntil) {
      attemptData = {
        attempts: 0,
        lockedUntil: null,
        firstAttempt: now
      };
    }
    
    // Increment attempts
    attemptData.attempts++;
    attemptData.lastAttempt = now;
    
    // Check if should be locked
    if (attemptData.attempts >= maxAttempts) {
      attemptData.lockedUntil = now + lockDuration;
      
      // Also update user account if exists
      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            'security.isLocked': true,
            'security.lockedUntil': new Date(attemptData.lockedUntil),
            'security.lockReason': 'Too many failed login attempts'
          }
        },
        { new: true }
      );

      // Send account locked notification
      if (user) {
        try {
          await notificationService.sendNotificationToUser(user._id, 'account_locked', {
            attemptCount: attemptData.attempts,
            unlockTime: Math.ceil(lockDuration / (60 * 1000)) + ' minutes',
            ipAddress: ip,
            lockedAt: new Date().toISOString()
          });
        } catch (notificationError) {
          console.error('Failed to send account locked notification:', notificationError);
        }
      }
    }
    
    failedAttempts.set(key, attemptData);
    
    return {
      isLocked: attemptData.lockedUntil && now < attemptData.lockedUntil,
      attemptsRemaining: Math.max(0, maxAttempts - attemptData.attempts),
      lockedUntil: attemptData.lockedUntil ? new Date(attemptData.lockedUntil) : null
    };
  } catch (error) {
    console.error('Failed login tracking error:', error);
    return { isLocked: false, attemptsRemaining: 5, lockedUntil: null };
  }
};

const clearFailedAttempts = (email, ip) => {
  const key = `${email}:${ip}`;
  failedAttempts.delete(key);
};

const checkAccountLock = async (email, ip) => {
  try {
    const key = `${email}:${ip}`;
    const now = Date.now();
    
    // Check in-memory tracking
    const attemptData = failedAttempts.get(key);
    if (attemptData && attemptData.lockedUntil && now < attemptData.lockedUntil) {
      return {
        isLocked: true,
        lockedUntil: new Date(attemptData.lockedUntil),
        reason: 'Too many failed login attempts'
      };
    }
    
    // Check database for user account lock
    const user = await User.findOne({ email });
    if (user && user.security?.isLocked) {
      const lockedUntil = user.security.lockedUntil;
      if (lockedUntil && now < lockedUntil.getTime()) {
        return {
          isLocked: true,
          lockedUntil: lockedUntil,
          reason: user.security.lockReason || 'Account locked'
        };
      } else {
        // Unlock expired lock
        await User.findOneAndUpdate(
          { email },
          {
            $unset: {
              'security.isLocked': 1,
              'security.lockedUntil': 1,
              'security.lockReason': 1
            }
          }
        );
      }
    }
    
    return { isLocked: false };
  } catch (error) {
    console.error('Account lock check error:', error);
    return { isLocked: false };
  }
};

const loginSecurityMiddleware = async (req, res, next) => {
  const { email } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  if (email) {
    const lockStatus = await checkAccountLock(email, ip);
    
    if (lockStatus.isLocked) {
      const timeRemaining = Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      
      return res.status(423).json({
        error: 'Account temporarily locked',
        message: `Account locked due to multiple failed login attempts. Try again in ${timeRemaining} minutes.`,
        lockedUntil: lockStatus.lockedUntil,
        reason: lockStatus.reason
      });
    }
  }
  
  // Store for potential use in login route
  req.loginSecurity = {
    trackFailedLogin: () => trackFailedLogin(email, ip),
    clearFailedAttempts: () => clearFailedAttempts(email, ip)
  };
  
  next();
};

module.exports = {
  trackFailedLogin,
  clearFailedAttempts,
  checkAccountLock,
  loginSecurityMiddleware
};
