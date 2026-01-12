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

    // Exclude certain routes from maintenance mode check
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/settings/public',
      '/api/admin', // All admin routes
      '/api/health', // Health check
    ];

    // Public GET routes that should be excluded
    const publicGetRoutes = [
      '/api/signals', // GET signals is public
      '/api/courses', // GET courses might be public
    ];

    // Check if the current path should be excluded
    const isExcluded = excludedPaths.some(path => {
      if (path.endsWith('/admin')) {
        return req.path.startsWith('/api/admin');
      }
      return req.path === path || req.path.startsWith(path + '/');
    });

    // Check if it's a public GET route
    const isPublicGetRoute = req.method === 'GET' && publicGetRoutes.some(route => {
      return req.path === route || req.path.startsWith(route + '/');
    });

    if (isExcluded || isPublicGetRoute) {
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

      // Allow access only for admin users
      if (user.role !== 'admin') {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'The system is currently under maintenance. Please try again later.',
          maintenanceMode: true
        });
      }

      // User is admin, allow access
      req.user = user;
      next();
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
