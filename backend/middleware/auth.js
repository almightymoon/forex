const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { resolvePackageFromPayment } = require('../utils/monthlyFeeStatus');
const { logActivity } = require('../services/activityLogService');

function normalizeRole(r) {
  return String(r || '').toLowerCase();
}

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Browsers may send an OPTIONS preflight before the real request.
    // Never require auth for preflight, and avoid double-logging.
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    // Developer impersonation:
    // A real developer (from DB) may carry an `effectiveRole` claim to temporarily act as
    // student/teacher/admin for UI parity. This must NEVER apply to non-developers.
    const realRole = normalizeRole(user.role);
    let effectiveRole = realRole;
    const claimedEffective = normalizeRole(decoded && decoded.effectiveRole);
    const allowedEffective = ['student', 'teacher', 'admin'];
    if (realRole === 'developer' && claimedEffective && allowedEffective.includes(claimedEffective)) {
      effectiveRole = claimedEffective;
    }

    // Attach both realRole and effectiveRole for downstream checks/routes.
    // Override `req.user.role` so existing `requireRole` checks work without refactors.
    req.user = user;
    req.user.realRole = realRole;
    req.user.effectiveRole = effectiveRole;
    req.user.isImpersonating = realRole === 'developer' && effectiveRole !== realRole;
    req.user.role = effectiveRole;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is not valid',
        sessionExpired: true,
        redirectTo: '/login',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Token has expired, please login again',
        sessionExpired: true,
        redirectTo: '/login',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error.message);
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

function isDeveloper(user) {
  // Prefer DB-backed `realRole` when present (dev impersonation overrides `user.role`)
  const r = user && (user.realRole || user.role);
  return !!user && normalizeRole(r) === 'developer';
}

// Middleware to check if user is teacher
const requireTeacher = requireRole(['teacher', 'admin', 'developer', 'instructor']);

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin', 'developer']);

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

      // Admin/Developer can access everything
      if (req.user.role === 'admin' || isDeveloper(req.user)) {
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

    if (!isEnrolled && req.user.role !== 'admin' && !isDeveloper(req.user)) {
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

    if (!isSubscribed && req.user.role !== 'admin' && !isDeveloper(req.user)) {
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

    // Admin/Developer can access everything
    if (req.user.role === 'admin' || isDeveloper(req.user)) {
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

    // Admin/Developer/Teachers can access everything
    if (req.user.role === 'admin' || isDeveloper(req.user) || req.user.role === 'teacher' || req.user.role === 'instructor') {
      return next();
    }

    // Fetch fresh user data from database to check current verification status
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      const Payment = require('../models/Payment');
      
      // Check if user has any pending payments
      const pendingPayment = await Payment.findOne({
        user: user._id,
        status: 'pending',
        type: 'package'
      }).sort({ createdAt: -1 });

      if (pendingPayment) {
        const hasTransactionId = !!(pendingPayment.transactionId && String(pendingPayment.transactionId).trim());
        const packageName = pendingPayment.package?.name || '';
        const amount = pendingPayment.finalAmount ?? pendingPayment.amount ?? 0;
        return res.status(403).json({
          error: hasTransactionId ? 'Payment verification pending' : 'Complete your payment',
          message: hasTransactionId
            ? 'Your payment is pending admin verification. You will be notified once your account is activated.'
            : 'Please complete your payment by entering your transaction ID.',
          code: 'PAYMENT_PENDING',
          redirectTo: hasTransactionId ? '/payment-pending' : '/payment',
          paymentId: pendingPayment._id,
          packageName,
          amount
        });
      }

      // Check if user has completed payment but not verified yet
      const completedPayment = await Payment.findOne({
        user: user._id,
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

    // Update req.user with fresh data
    req.user = user;
    next();

  } catch (error) {
    console.error('Payment verification check error:', error);
    return res.status(500).json({ 
      error: 'Authorization error',
      message: 'Internal server error during payment verification check'
    });
  }
};

function startOfUtcMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addUtcMonths(date, months) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + months, 1, 0, 0, 0, 0));
}

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

    // Admin/Developer/Teachers can access everything without package
    if (req.user.role === 'admin' || isDeveloper(req.user) || req.user.role === 'teacher' || req.user.role === 'instructor') {
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
      const now = new Date();
      const currentMonthStart = startOfUtcMonth(now);
      const requiredMonthStart = addUtcMonths(currentMonthStart, -1);
      const requiredMonthEnd = currentMonthStart;

      const pkg = await resolvePackageFromPayment(completedPackagePayment);
      const defaultFeeAmount = pkg ? Number(pkg.monthlyFeeAmount ?? 50) : 50;

      // Admin-imposed pending fee with "block until paid" must run BEFORE the
      // `!monthlyFeeEnabled` shortcut — otherwise FX Legacy / no-fee tiers never hit this check.
      const adminBlockingPending = await Payment.findOne({
        user: req.user._id,
        type: 'monthly_fee',
        status: 'pending',
        'metadata.accessBlockedUntilPaid': '1'
      })
        .sort({ createdAt: -1 })
        .lean();

      if (adminBlockingPending) {
        const amt = Number(
          adminBlockingPending.finalAmount ?? adminBlockingPending.amount ?? defaultFeeAmount
        );
        return res.status(403).json({
          error: 'Monthly fee required',
          message:
            'Your administrator requires a monthly fee payment before you can continue. Please complete it on the Monthly fee page.',
          code: 'MONTHLY_FEE_REQUIRED',
          redirectTo: '/monthly-fee',
          amount: amt,
          dueForMonth: requiredMonthStart.toISOString(),
          adminImposed: true
        });
      }

      // If package config missing, fail open (don't lock users out) — except admin block above.
      if (!pkg) return next();

      const monthlyFeeEnabled = !!pkg.monthlyFeeEnabled;
      const freeMonths = Number(pkg.monthlyFeeFreeMonths ?? 0);
      const graceDays = Number(pkg.monthlyFeeGraceDays ?? 3);
      const feeAmount = Number(pkg.monthlyFeeAmount ?? 50);

      // Lifetime / no-fee packages (no recurring policy — admin one-off charges handled above)
      if (!monthlyFeeEnabled) return next();

      // Within free period after package purchase? (e.g. 6 months free)
      const purchasedAt = completedPackagePayment.createdAt ? new Date(completedPackagePayment.createdAt) : new Date();
      const freeUntil = addUtcMonths(startOfUtcMonth(purchasedAt), freeMonths);
      if (now < freeUntil) return next();

      // If the required month falls inside the free period window, no fee required yet.
      if (requiredMonthStart < freeUntil) return next();

      // Admin-set billing start: no obligation for calendar months strictly before this UTC month.
      const anchorRaw = req.user.monthlyFeeBillingStartsMonthStart;
      if (anchorRaw) {
        const billingStart = startOfUtcMonth(new Date(anchorRaw));
        if (requiredMonthStart.getTime() < billingStart.getTime()) return next();
      }

      // Still within grace days: don't block (but user can pay anytime).
      if (now.getUTCDate() <= graceDays) return next();

      const paidFee = await Payment.findOne({
        user: req.user._id,
        status: 'completed',
        type: 'monthly_fee',
        createdAt: { $gte: requiredMonthStart, $lt: requiredMonthEnd }
      }).sort({ createdAt: -1 });

      if (paidFee) return next();

      return res.status(403).json({
        error: 'Monthly fee required',
        message:
          'Your monthly fee payment is due. Please pay to regain access.',
        code: 'MONTHLY_FEE_REQUIRED',
        redirectTo: '/monthly-fee',
        amount: feeAmount,
        dueForMonth: requiredMonthStart.toISOString()
      });
    }

    // Check if user has pending payment
    const pendingPayment = await Payment.findOne({
      user: req.user._id,
      status: 'pending',
      type: 'package'
    }).sort({ createdAt: -1 });

    if (pendingPayment) {
      const hasTransactionId = !!(pendingPayment.transactionId && String(pendingPayment.transactionId).trim());
      const packageName = pendingPayment.package?.name || '';
      const amount = pendingPayment.finalAmount ?? pendingPayment.amount ?? 0;
      return res.status(403).json({
        error: hasTransactionId ? 'Payment verification pending' : 'Complete your payment',
        message: hasTransactionId
          ? 'Your payment is pending admin verification. Please check your email for updates once your account is activated.'
          : 'Please complete your payment by entering your transaction ID.',
        code: 'PAYMENT_PENDING',
        redirectTo: hasTransactionId ? '/payment-pending' : '/payment',
        paymentId: pendingPayment._id,
        packageName,
        amount
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
    
    if (role && !['student', 'teacher', 'admin', 'developer', 'instructor'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be one of: student, teacher, admin, developer'
      });
    }

    // Only a developer can assign/remove developer role.
    // Enforce server-side even if UI hides the option.
    if (role && String(role).toLowerCase() === 'developer' && !isDeveloper(req.user)) {
      logActivity({
        req,
        action: 'security.forbidden_role_assignment',
        entity: { type: 'user_role', label: 'developer' },
        metadata: { attemptedRole: role, targetUserId: req.params?.id }
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only a developer can assign the developer role'
      });
    }
  }
  
  next();
};

// Prevent any non-developer from mutating a developer account.
// Use on mutation endpoints (PUT/PATCH/DELETE) that target a user id in params.
const protectDeveloperAccount = (options = {}) => {
  const paramKey = options.paramKey || 'id';
  return async (req, res, next) => {
    try {
      const targetId = req.params?.[paramKey];
      if (!targetId) return next();

      // Developers can mutate developer accounts (including other developers).
      if (isDeveloper(req.user)) return next();

      const target = await User.findById(targetId).select('email role').lean();
      if (!target) return next();

      if (String(target.role || '').toLowerCase() === 'developer') {
        await logActivity({
          req,
          action: 'security.forbidden_developer_mutation',
          entity: { type: 'user', id: targetId, label: target.email },
          metadata: {
            method: req.method,
            path: req.path,
            actorRole: req.user?.role,
            targetRole: target.role
          }
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Developer accounts are protected and cannot be modified'
        });
      }

      return next();
    } catch (error) {
      console.error('protectDeveloperAccount error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during authorization check'
      });
    }
  };
};


/** Attach user when a valid Bearer token is present; otherwise continue anonymously. */
const optionalAuthenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) return next();

    const realRole = normalizeRole(user.role);
    let effectiveRole = realRole;
    const claimedEffective = normalizeRole(decoded && decoded.effectiveRole);
    const allowedEffective = ['student', 'teacher', 'admin'];
    if (realRole === 'developer' && claimedEffective && allowedEffective.includes(claimedEffective)) {
      effectiveRole = claimedEffective;
    }

    req.user = user;
    req.user.realRole = realRole;
    req.user.effectiveRole = effectiveRole;
    req.user.isImpersonating = realRole === 'developer' && effectiveRole !== realRole;
    req.user.role = effectiveRole;
    return next();
  } catch {
    return next();
  }
};


module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  requireTeacher,
  requireAdmin,
  requireOwnership,
  requireEnrollment,
  requireSignalSubscription,
  requireSubscription,
  requireVerifiedPayment,
  requirePackageSubscription,
  validateUserRole,
  protectDeveloperAccount
};
