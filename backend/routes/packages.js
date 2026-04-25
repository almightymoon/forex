const express = require('express');
const Package = require('../models/Package');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/packages
// @desc    Get active packages (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Ensure defaults exist for first-time deployments
    await Package.ensureDefaults();
    const packages = await Package.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    res.json(packages);
  } catch (error) {
    console.error('Get public packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// @route   GET /api/packages/upgrade-options
// @desc    Student: current package + next package + upgrade price difference
// @access  Private
router.get('/upgrade-options', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Package.ensureDefaults();

    const currentPayment = await Payment.findOne({
      user: userId,
      status: 'completed',
      type: 'package'
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!currentPayment?.package?.name) {
      return res.json({
        hasUpgrade: false,
        reason: 'NO_ACTIVE_PACKAGE'
      });
    }

    const currentPackage =
      (await Package.findOne({ name: currentPayment.package.name, isActive: true }).lean()) ||
      (await Package.findOne({ price: Number(currentPayment.package.price || 0), isActive: true }).lean());

    if (!currentPackage) {
      return res.json({
        hasUpgrade: false,
        reason: 'CURRENT_PACKAGE_NOT_FOUND'
      });
    }

    const higherPackages = await Package.find({
      isActive: true,
      sortOrder: { $gt: Number(currentPackage.sortOrder || 0) }
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const nextPackage = higherPackages?.[0] || null;

    if (!nextPackage) {
      return res.json({
        hasUpgrade: false,
        reason: 'NO_NEXT_PACKAGE',
        current: {
          name: currentPackage.name,
          price: Number(currentPackage.price || 0),
          sortOrder: Number(currentPackage.sortOrder || 0)
        }
      });
    }

    const targets = (higherPackages || [])
      .map((p) => ({
        name: p.name,
        price: Number(p.price || 0),
        sortOrder: Number(p.sortOrder || 0),
        // Upgrade payment is full target package price (not difference)
        upgradePrice: Number(p.price || 0)
      }))
      .filter((t) => Number.isFinite(t.upgradePrice) && t.upgradePrice > 0);

    // Next-tier upgrade payment is full next package price
    const upgradePrice = Number(nextPackage.price || 0);
    if (!Number.isFinite(upgradePrice) || upgradePrice <= 0) {
      return res.json({
        hasUpgrade: false,
        reason: 'INVALID_UPGRADE_PRICE',
        current: { name: currentPackage.name, price: Number(currentPackage.price || 0) },
        next: { name: nextPackage.name, price: Number(nextPackage.price || 0) }
      });
    }

    return res.json({
      hasUpgrade: targets.length > 0,
      current: {
        name: currentPackage.name,
        price: Number(currentPackage.price || 0),
        sortOrder: Number(currentPackage.sortOrder || 0)
      },
      next: {
        name: nextPackage.name,
        price: Number(nextPackage.price || 0),
        sortOrder: Number(nextPackage.sortOrder || 0)
      },
      upgradePrice,
      targets
    });
  } catch (error) {
    console.error('Get upgrade options error:', error);
    return res.status(500).json({ error: 'Failed to fetch upgrade options' });
  }
});

module.exports = router;
