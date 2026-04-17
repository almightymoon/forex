/**
 * Middleware to check if user has access to specific package perks
 */

const { hasPerkAccess, getPackagePerks } = require('../config/packagePerks');

/**
 * Middleware to check if user has access to a specific perk
 * @param {string} perkName - Name of the perk to check
 * @returns {Function} Express middleware
 */
const requirePerk = (perkName) => {
  return async (req, res, next) => {
    try {
      // Admin and teachers have access to everything
      if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor')) {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please login to access this feature'
        });
      }

      // Get user's package from completed payment
      const Payment = require('../models/Payment');
      const completedPayment = await Payment.findOne({
        user: req.user._id,
        status: 'completed',
        type: 'package'
      }).sort({ createdAt: -1 });

      if (!completedPayment || !completedPayment.package || !completedPayment.package.price) {
        return res.status(403).json({
          error: 'Package subscription required',
          message: `This feature requires a package subscription. Please subscribe to access ${perkName}.`,
          code: 'PACKAGE_REQUIRED',
          perk: perkName
        });
      }

      const packagePrice = completedPayment.package.price;
      const hasAccess = hasPerkAccess(packagePrice, perkName);

      if (!hasAccess) {
        const packageData = getPackagePerks(packagePrice);
        const currentPackageName = packageData ? packageData.name : 'your current package';
        
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature (${perkName}) is not available in ${currentPackageName}. Please upgrade your package to access this feature.`,
          code: 'PERK_NOT_AVAILABLE',
          perk: perkName,
          currentPackage: currentPackageName
        });
      }

      // Attach package info to request for use in route handlers
      req.userPackage = {
        price: packagePrice,
        name: completedPayment.package.name || packageData?.name
      };

      next();
    } catch (error) {
      console.error('Package perk check error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during perk check'
      });
    }
  };
};

/**
 * Middleware to check if user has access to any of the specified perks
 * @param {string[]} perkNames - Array of perk names (user needs at least one)
 * @returns {Function} Express middleware
 */
const requireAnyPerk = (perkNames) => {
  return async (req, res, next) => {
    try {
      // Admin and teachers have access to everything
      if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor')) {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please login to access this feature'
        });
      }

      // Get user's package from completed payment
      const Payment = require('../models/Payment');
      const completedPayment = await Payment.findOne({
        user: req.user._id,
        status: 'completed',
        type: 'package'
      }).sort({ createdAt: -1 });

      if (!completedPayment || !completedPayment.package || !completedPayment.package.price) {
        return res.status(403).json({
          error: 'Package subscription required',
          message: 'This feature requires a package subscription.',
          code: 'PACKAGE_REQUIRED'
        });
      }

      const packagePrice = completedPayment.package.price;
      
      // Check if user has access to any of the required perks
      const hasAccess = perkNames.some(perkName => hasPerkAccess(packagePrice, perkName));

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          message: 'This feature is not available in your current package. Please upgrade to access this feature.',
          code: 'PERK_NOT_AVAILABLE',
          requiredPerks: perkNames
        });
      }

      req.userPackage = {
        price: packagePrice,
        name: completedPayment.package.name
      };

      next();
    } catch (error) {
      console.error('Package perk check error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during perk check'
      });
    }
  };
};

module.exports = {
  requirePerk,
  requireAnyPerk
};
