const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Headers:', req.headers);
    console.log('Auth middleware - Auth header:', authHeader);
    console.log('Auth middleware - Token:', token ? `${token.substring(0, 20)}...` : 'No token');

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('Auth middleware - Decoded token:', decoded);
    
    const user = await User.findById(decoded.userId).select('-password');
    console.log('Auth middleware - Found user:', user ? { id: user._id, email: user.email, role: user.role } : 'No user found');

    if (!user) {
      console.log('Auth middleware - User not found in database');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      console.log('Auth middleware - User account deactivated');
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    console.log('Auth middleware - Authentication successful for user:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware - Error details:', error);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('Auth middleware - Invalid token format');
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is not valid',
        sessionExpired: true,
        redirectTo: '/login',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('Auth middleware - Token expired');
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Token has expired, please login again',
        sessionExpired: true,
        redirectTo: '/login',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Middleware to check if user is teacher
const requireTeacher = requireRole(['teacher', 'admin']);

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin']);

// Middleware to check if user owns resource or is admin
const requireOwnership = (modelName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please login to access this resource'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params.id || req.params.courseId || req.params.sessionId || req.params.signalId;
      
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID required',
          message: 'Resource ID is missing from request'
        });
      }

      const Model = require(`../models/${modelName}`);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          error: 'Resource not found',
          message: 'The requested resource does not exist'
        });
      }

      // Check if user owns the resource
      if (resource.teacher && resource.teacher.toString() === req.user._id.toString()) {
        return next();
      }

      // Check if user is the creator (for promo codes, etc.)
      if (resource.createdBy && resource.createdBy.toString() === req.user._id.toString()) {
        return next();
      }

      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });

    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Authorization error',
        message: 'Internal server error during authorization check'
      });
    }
  };
};

// Middleware to check if user is enrolled in course
const requireEnrollment = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    const courseId = req.params.courseId || req.params.id;
    
    if (!courseId) {
      return res.status(400).json({ 
        error: 'Course ID required',
        message: 'Course ID is missing from request'
      });
    }

    const Course = require('../models/Course');
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ 
        error: 'Course not found',
        message: 'The requested course does not exist'
      });
    }

    // Check if user is enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (!isEnrolled && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Enrollment required',
        message: 'You must be enrolled in this course to access this resource'
      });
    }

    req.course = course;
    next();

  } catch (error) {
    console.error('Enrollment check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during enrollment check'
    });
  }
};

// Middleware to check if user is subscribed to signal
const requireSignalSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    const signalId = req.params.signalId || req.params.id;
    
    if (!signalId) {
      return res.status(400).json({ 
        error: 'Signal ID required',
        message: 'Signal ID is missing from request'
      });
    }

    const TradingSignal = require('../models/TradingSignal');
    const signal = await TradingSignal.findById(signalId);

    if (!signal) {
      return res.status(404).json({ 
        error: 'Signal not found',
        message: 'The requested signal does not exist'
      });
    }

    // Check if user is subscribed or if signal is public
    if (signal.isPublic) {
      req.signal = signal;
      return next();
    }

    const isSubscribed = signal.subscribers.some(
      sub => sub.student.toString() === req.user._id.toString() && sub.isActive
    );

    if (!isSubscribed && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'You must be subscribed to this signal to access this resource'
      });
    }

    req.signal = signal;
    next();

  } catch (error) {
    console.error('Signal subscription check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during subscription check'
    });
  }
};

// Middleware to check if user has active subscription
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has active subscription
    if (!req.user.isSubscribed) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'You need an active subscription to access this resource'
      });
    }

    next();

  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during subscription check'
    });
  }
};

// Middleware to check if user has verified payment
const requireVerifiedPayment = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    // Admin and teachers can access everything
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      return next();
    }

    // Check if user is verified
    if (!req.user.isVerified) {
      const Payment = require('../models/Payment');
      
      // Check if user has any pending payments
      const pendingPayment = await Payment.findOne({
        user: req.user._id,
        status: 'pending',
        type: 'package'
      }).sort({ createdAt: -1 });

      if (pendingPayment) {
        return res.status(403).json({ 
          error: 'Payment verification pending',
          message: 'Your payment is pending admin verification. You will be notified once your account is activated.',
          code: 'PAYMENT_PENDING',
          redirectTo: '/payment',
          paymentId: pendingPayment._id
        });
      }

      // Check if user has completed payment but not verified yet
      const completedPayment = await Payment.findOne({
        user: req.user._id,
        status: 'completed',
        type: 'package'
      }).sort({ createdAt: -1 });

      if (!completedPayment) {
        return res.status(403).json({ 
          error: 'Payment required',
          message: 'Please select a package and complete payment to access this resource.',
          code: 'PAYMENT_REQUIRED',
          redirectTo: '/select-package'
        });
      }

      // Payment completed but user not verified - this shouldn't happen normally
      return res.status(403).json({ 
        error: 'Account verification pending',
        message: 'Your payment has been received but your account is still being verified. Please contact support if this takes longer than expected.',
        code: 'VERIFICATION_PENDING'
      });
    }

    next();

  } catch (error) {
    console.error('Payment verification check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during payment verification check'
    });
  }
};

// Middleware to check if user has an active package subscription
// This is required for ALL users (except admin/teacher) to access the application
const requirePackageSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    // Admin and teachers can access everything without package
    if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor') {
      return next();
    }

    const Payment = require('../models/Payment');
    
    // Check if user has a completed package payment
    const completedPackagePayment = await Payment.findOne({
      user: req.user._id,
      status: 'completed',
      type: 'package'
    }).sort({ createdAt: -1 });

    if (completedPackagePayment) {
      // User has completed payment, allow access
      return next();
    }

    // Check if user has pending payment
    const pendingPayment = await Payment.findOne({
      user: req.user._id,
      status: 'pending',
      type: 'package'
    }).sort({ createdAt: -1 });

    if (pendingPayment) {
      return res.status(403).json({ 
        error: 'Payment verification pending',
        message: 'Your payment is pending admin verification. Please check your email for updates once your account is activated.',
        code: 'PAYMENT_PENDING',
        redirectTo: '/payment-pending'
      });
    }

    // No package payment found - redirect to package selection
    return res.status(403).json({ 
      error: 'Package subscription required',
      message: 'You must subscribe to a package to access the application. Please select and purchase a package.',
      code: 'PACKAGE_REQUIRED',
      redirectTo: '/select-package'
    });

  } catch (error) {
    console.error('Package subscription check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during package subscription check'
    });
  }
};

// Add role validation middleware to prevent incorrect role assignments
const validateUserRole = (req, res, next) => {
  // Only validate on user creation/update
  if (req.method === 'POST' || req.method === 'PUT') {
    const { role } = req.body;
    
    if (role && !['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: student, teacher, admin'
      });
    }
  }
  
  next();
};


module.exports = {
  authenticateToken,
  requireRole,
  requireTeacher,
  requireAdmin,
  requireOwnership,
  requireEnrollment,
  requireSignalSubscription,
  requireSubscription,
  requireVerifiedPayment,
  requirePackageSubscription,
  validateUserRole
};
