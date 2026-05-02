const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');

const maintenanceMiddleware = async (req, res, next) => {
  try {
    // Get current settings with error handling
    let settings;
    try {
      settings = await Settings.getSettings();
    } catch (settingsError) {
      console.error('Failed to get settings for maintenance mode:', settingsError);
      // If we can't get settings, assume maintenance mode is off
      return next();
    }
    
    // If maintenance mode is disabled, allow all requests
    if (!settings || !settings.maintenanceMode) {
      return next();
    }

    // Only exclude routes needed for login and public maintenance status (no /api/admin bypass)
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/settings/public',
      '/api/monthly-progress/public',
      '/api/new-joiners/public',
      '/api/health'
    ];

    const requestPath = (req.baseUrl && req.path) ? req.baseUrl + req.path : (req.originalUrl ? req.originalUrl.split('?')[0] : req.path);
    const isExcluded = excludedPaths.some(path => requestPath === path || requestPath.startsWith(path + '/'));

    if (isExcluded) {
      return next();
    }

    // Check if user is authenticated and is admin
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'The system is currently under maintenance. Please try again later.',
        maintenanceMode: true
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'The system is currently under maintenance. Please try again later.',
          maintenanceMode: true
        });
      }

      const allowTeachers = settings.maintenanceAllowTeachers === true;

      // Allow admin always; allow teacher only if admin enabled it
      if (user.role === 'admin') {
        req.user = user;
        return next();
      }
      if (user.role === 'teacher' && allowTeachers) {
        req.user = user;
        return next();
      }

      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'The system is currently under maintenance. Please try again later.',
        maintenanceMode: true
      });
    } catch (error) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'The system is currently under maintenance. Please try again later.',
        maintenanceMode: true
      });
    }
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    // If there's an error checking settings, allow the request to proceed
    next();
  }
};

module.exports = maintenanceMiddleware;
