const express = require('express');
const { body, validationResult } = require('express-validator');
const PromoCode = require('../models/PromoCode');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/promos
// @desc    Get all active promo codes (admin only)
// @access  Private/Admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (error) {
    console.error('Get promos error:', error);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

// @route   GET /api/promos/active
// @desc    Get active promo codes (public)
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const promos = await PromoCode.findActive();
    res.json(promos);
  } catch (error) {
    console.error('Get active promos error:', error);
    res.status(500).json({ error: 'Failed to fetch active promo codes' });
  }
});

// @route   GET /api/promos/:id
// @desc    Get promo code by ID
// @access  Private/Admin
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }
    res.json(promo);
  } catch (error) {
    console.error('Get promo error:', error);
    res.status(500).json({ error: 'Failed to fetch promo code' });
  }
});

// @route   POST /api/promos
// @desc    Create new promo code (admin only)
// @access  Private/Admin
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isNumeric().withMessage('Discount value is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  body('applicableTo').isArray().withMessage('Applicable to must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const promoData = {
      ...req.body,
      createdBy: req.user._id
    };

    const promo = new PromoCode(promoData);
    await promo.save();

    res.status(201).json({
      message: 'Promo code created successfully',
      promo
    });

  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// @route   PUT /api/promos/:id
// @desc    Update promo code (admin only)
// @access  Private/Admin
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('discountValue').optional().isNumeric().withMessage('Discount value must be a number'),
  body('validUntil').optional().isISO8601().withMessage('Valid until date must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const promo = await PromoCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    res.json({
      message: 'Promo code updated successfully',
      promo
    });

  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

// @route   DELETE /api/promos/:id
// @desc    Delete promo code (admin only)
// @access  Private/Admin
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    await PromoCode.findByIdAndDelete(req.params.id);

    res.json({ message: 'Promo code deleted successfully' });

  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

// @route   POST /api/promos/validate
// @desc    Validate promo code
// @access  Public
router.post('/validate', [
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('orderAmount').isNumeric().withMessage('Order amount is required'),
  body('orderType').isIn(['signup', 'course', 'session', 'subscription', 'signal']).withMessage('Invalid order type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, orderAmount, orderType } = req.body;

    // For public validation, we don't have user context
    const promo = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      validUntil: { $gt: new Date() }
    });

    if (!promo) {
      return res.status(400).json({ 
        valid: false, 
        reason: 'Invalid or expired promo code' 
      });
    }

    // Check if applicable to order type
    if (!promo.applicableTo.includes('all') && !promo.applicableTo.includes(orderType)) {
      return res.status(400).json({ 
        valid: false, 
        reason: 'Promo code not applicable to this order type' 
      });
    }

    // Check minimum amount
    if (orderAmount < promo.minimumAmount) {
      return res.status(400).json({ 
        valid: false, 
        reason: `Minimum order amount is $${promo.minimumAmount}` 
      });
    }

    const discount = promo.applyToOrder(orderAmount);

    res.json({
      valid: true,
      promo: {
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discount: discount
      }
    });

  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

module.exports = router;
