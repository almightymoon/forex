/**
 * Routes for package perks
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getPackagePerks, getEnabledPerks, getPerkDetails } = require('../config/packagePerks');

/**
 * @route   GET /api/package-perks
 * @desc    Get user's available perks based on their package
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Admin and teachers have access to all perks
    if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor') {
      // Return all perks from all packages
      const allPerks = {
        hasPackage: true,
        packageName: 'Admin/Teacher',
        packagePrice: null,
        perks: {
          100: getPackagePerks(100)?.perks || {},
          250: getPackagePerks(250)?.perks || {},
          1000: getPackagePerks(1000)?.perks || {}
        },
        enabledPerks: ['all'],
        isAdmin: true
      };
      return res.json(allPerks);
    }

    // Get user's package from completed payment
    const Payment = require('../models/Payment');
    const completedPayment = await Payment.findOne({
      user: req.user._id,
      status: 'completed',
      type: 'package'
    }).sort({ createdAt: -1 });

    if (!completedPayment) {
      console.log(`[Package Perks] No completed payment found for user ${req.user._id}`);
      return res.json({
        hasPackage: false,
        packageName: null,
        packagePrice: null,
        perks: {},
        enabledPerks: [],
        message: 'No active package subscription found'
      });
    }

    // Try to get package price from multiple possible locations
    let packagePrice = null;
    if (completedPayment.package && completedPayment.package.price) {
      packagePrice = completedPayment.package.price;
    } else if (completedPayment.amount) {
      // Fallback: use amount if package.price is not set
      // Map common amounts to package prices
      if (completedPayment.amount === 100 || completedPayment.amount === 250 || completedPayment.amount === 1000) {
        packagePrice = completedPayment.amount;
      }
    } else if (completedPayment.package && completedPayment.package.name) {
      // Fallback: derive price from package name
      const nameToPrice = {
        'FX Launch': 100,
        'FX Scale': 250,
        'FX Legacy': 1000
      };
      packagePrice = nameToPrice[completedPayment.package.name];
    }

    if (!packagePrice) {
      console.log(`[Package Perks] No package price found for payment ${completedPayment._id}`, {
        package: completedPayment.package,
        amount: completedPayment.amount
      });
      return res.json({
        hasPackage: false,
        packageName: null,
        packagePrice: null,
        perks: {},
        enabledPerks: [],
        message: 'Package price not found in payment record'
      });
    }

    const packageData = getPackagePerks(packagePrice);
    const enabledPerks = getEnabledPerks(packagePrice);

    if (!packageData) {
      return res.status(404).json({
        error: 'Package not found',
        message: 'Package configuration not found for your subscription'
      });
    }

    // Get package name from payment or use the one from config
    const packageName = completedPayment.package?.name || packageData.name;

    res.json({
      hasPackage: true,
      packageName: packageName,
      packagePrice: packagePrice,
      perks: packageData.perks,
      enabledPerks: enabledPerks,
      subscriptionDate: completedPayment.confirmedAt || completedPayment.createdAt
    });
  } catch (error) {
    console.error('Error fetching package perks:', error);
    res.status(500).json({
      error: 'Failed to fetch package perks',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/package-perks/check/:perkName
 * @desc    Check if user has access to a specific perk
 * @access  Private
 */
router.get('/check/:perkName', authenticateToken, async (req, res) => {
  try {
    const { perkName } = req.params;

    // Admin and teachers have access to everything
    if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor') {
      return res.json({
        hasAccess: true,
        perkName: perkName,
        reason: 'admin_or_teacher'
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
      return res.json({
        hasAccess: false,
        perkName: perkName,
        reason: 'no_package',
        message: 'No active package subscription found'
      });
    }

    const packagePrice = completedPayment.package.price;
    const perkDetails = getPerkDetails(packagePrice, perkName);

    if (!perkDetails) {
      return res.json({
        hasAccess: false,
        perkName: perkName,
        reason: 'perk_not_found',
        message: 'Perk not found in package configuration'
      });
    }

    res.json({
      hasAccess: perkDetails.enabled,
      perkName: perkName,
      perkDetails: perkDetails,
      packagePrice: packagePrice,
      packageName: completedPayment.package.name
    });
  } catch (error) {
    console.error('Error checking perk access:', error);
    res.status(500).json({
      error: 'Failed to check perk access',
      message: error.message
    });
  }
});

module.exports = router;
