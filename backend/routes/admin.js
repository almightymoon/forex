const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const TradingSignal = require('../models/TradingSignal');
const Payment = require('../models/Payment');
const PromoCode = require('../models/PromoCode');
const Settings = require('../models/Settings');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID (admin only)
// @access  Private (Admin)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user (admin only)
// @access  Private (Admin)
router.post('/users', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      country, 
      role = 'student',
      isActive = true,
      isVerified = false 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by the pre-save hook
      phone,
      country,
      role,
      isActive,
      isVerified,
      paymentMethod: 'credit_card' // Default payment method
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      country, 
      role, 
      isActive, 
      isVerified,
      subscription 
    } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (subscription !== undefined) user.subscription = subscription;

    // Only update password if provided
    if (password && password.trim() !== '') {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();
    
    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Note: Course management moved to Instructor Dashboard







// Note: Trading signals management moved to Instructor Dashboard





// @route   GET /api/admin/payments
// @desc    Get all payments (admin only)
// @access  Private (Admin)
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// @route   PUT /api/admin/payments/:id
// @desc    Update payment status (admin only)
// @access  Private (Admin)
router.put('/payments/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = status;
    await payment.save();
    
    res.json({ message: 'Payment status updated successfully', payment });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get platform analytics (admin only)
// @access  Private (Admin)
router.get('/analytics', async (req, res) => {
  try {
    // Get current date and last month date
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count users this month
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: lastMonth } });
    
    // Calculate monthly growth
    const lastMonthUsers = await User.countDocuments({
      createdAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        $lt: lastMonth 
      }
    });
    
    const monthlyGrowth = lastMonthUsers > 0 
      ? Math.round(((usersThisMonth - lastMonthUsers) / lastMonthUsers) * 100)
      : 0;
    
    // Calculate total revenue
    const completedPayments = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Count active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    
    // Count total payments
    const totalPayments = await Payment.countDocuments();
    
    // Count payments this month
    const paymentsThisMonth = await Payment.countDocuments({ createdAt: { $gte: lastMonth } });
    
    // Count active promo codes
    const activePromoCodes = await PromoCode.countDocuments({ isActive: true });
    
    // Payment method breakdown
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get monthly revenue data for chart (last 6 months)
    const monthlyRevenue = [];
    const monthlyUserGrowth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Monthly revenue
      const monthRevenue = await Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      // Monthly user registrations
      const monthUsers = await User.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue[0]?.total || 0
      });
      
      monthlyUserGrowth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: monthUsers
      });
    }
    
    const analytics = {
      totalUsers,
      totalRevenue: completedPayments[0]?.total || 0,
      monthlyGrowth,
      activeUsers,
      totalPayments,
      paymentsThisMonth,
      activePromoCodes,
      monthlyRevenue,
      monthlyUserGrowth,
      paymentMethodStats: paymentMethodStats.map(stat => ({
        method: stat._id,
        count: stat.count,
        totalAmount: stat.totalAmount
      }))
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// @route   GET /api/admin/promocodes
// @desc    Get all promo codes (admin only)
// @access  Private (Admin)
router.get('/promocodes', async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({}).sort({ createdAt: -1 });
    res.json(promoCodes);
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

// @route   POST /api/admin/promocodes
// @desc    Create new promo code (admin only)
// @access  Private (Admin)
router.post('/promocodes', async (req, res) => {
  try {
    const { 
      code, 
      discountType, 
      discountValue, 
      maxUses, 
      expiresAt, 
      description,
      isActive = true 
    } = req.body;
    
    // Set validUntil - if no expiresAt provided, set to 1 year from now
    const validUntil = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      description: description || `${discountType === 'percentage' ? discountValue + '%' : '$' + discountValue} discount`,
      discountType,
      discountValue,
      maxUses: maxUses || null,
      validUntil,
      isActive,
      createdBy: req.user._id, // Add the admin user who created it
      applicableTo: ['signup'] // Default to signup
    });
    
    await promoCode.save();
    
    res.status(201).json(promoCode);
  } catch (error) {
    console.error('Create promo code error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// @route   PUT /api/admin/promocodes/:id
// @desc    Update promo code (admin only)
// @access  Private (Admin)
router.put('/promocodes/:id', async (req, res) => {
  try {
    const { 
      code, 
      discountType, 
      discountValue, 
      maxUses, 
      expiresAt, 
      description,
      isActive 
    } = req.body;
    
    const promoCode = await PromoCode.findById(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }
    
    // Update fields
    if (code !== undefined) promoCode.code = code.toUpperCase();
    if (description !== undefined) promoCode.description = description;
    if (discountType !== undefined) promoCode.discountType = discountType;
    if (discountValue !== undefined) promoCode.discountValue = discountValue;
    if (maxUses !== undefined) promoCode.maxUses = maxUses || null;
    if (isActive !== undefined) promoCode.isActive = isActive;
    if (expiresAt !== undefined) promoCode.validUntil = new Date(expiresAt);
    
    await promoCode.save();
    
    res.json(promoCode);
  } catch (error) {
    console.error('Update promo code error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

// @route   DELETE /api/admin/promocodes/:id
// @desc    Delete promo code (admin only)
// @access  Private (Admin)
router.delete('/promocodes/:id', async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    await PromoCode.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Delete promo code error:', error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

// @route   GET /api/admin/payments/export
// @desc    Export payments as CSV (admin only)
// @access  Private (Admin)
router.get('/payments/export', async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    // Create CSV content
    const csvHeader = 'Payment ID,User Name,Email,Amount,Currency,Status,Payment Method,Date,Transaction ID\n';
    const csvRows = payments.map(payment => {
      const userName = `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim();
      const email = payment.user?.email || '';
      const date = new Date(payment.createdAt).toLocaleDateString();
      
      return `"${payment._id}","${userName}","${email}","${payment.amount}","${payment.currency}","${payment.status}","${payment.paymentMethod}","${date}","${payment.transactionId || ''}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ error: 'Failed to export payments' });
  }
});

// @route   GET /api/admin/settings
// @desc    Get platform settings (admin only)
// @access  Private (Admin)
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Format the response to match frontend expectations
    const formattedSettings = {
      general: {
        platformName: settings.platformName,
        description: settings.description,
        defaultCurrency: settings.defaultCurrency,
        timezone: settings.timezone,
        language: settings.language,
        maintenanceMode: settings.maintenanceMode
      },
      security: settings.security,
      notifications: settings.notifications,
      payments: settings.payments,
      courses: settings.courses,
      email: settings.email
    };
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update platform settings (admin only)
// @access  Private (Admin)
router.put('/settings', async (req, res) => {
  try {
    const { general, security, notifications, payments, courses, email } = req.body;
    
    // Flatten the structure to match the model
    const updateData = {
      ...general,
      security,
      notifications,
      payments,
      courses,
      email
    };
    
    const settings = await Settings.updateSettings(updateData);
    console.log('Settings updated in database:', settings.platformName);
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
