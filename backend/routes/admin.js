const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { clearFailedAttemptsByEmail } = require('../middleware/loginSecurity');
const User = require('../models/User');
const Course = require('../models/Course');
const TradingSignal = require('../models/TradingSignal');
const Payment = require('../models/Payment');
const PromoCode = require('../models/PromoCode');
const Settings = require('../models/Settings');
const Withdrawal = require('../models/Withdrawal');
const BalanceTransaction = require('../models/BalanceTransaction');
const NotificationTracking = require('../models/NotificationTracking');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/email-history
// @desc    List emails sent to users (admin only). Query: userId, type, status, limit, skip
// @access  Private (Admin)
router.get('/email-history', async (req, res) => {
  try {
    const { userId, type, status, limit = 50, skip = 0 } = req.query;
    const query = { channel: 'email' };
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    const [items, total] = await Promise.all([
      NotificationTracking.find(query)
        .populate('userId', 'email firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 200))
        .lean(),
      NotificationTracking.countDocuments(query)
    ]);

    res.json({ items, total });
  } catch (error) {
    console.error('Get email history error:', error);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

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

// @route   PUT /api/admin/users/:id/email-unreachable
// @desc    Mark user's email as unreachable / stop sending emails (admin only)
// @access  Private (Admin)
router.put('/users/:id/email-unreachable', [
  body('emailUnreachable').isBoolean().withMessage('emailUnreachable must be true or false'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason max 500 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { emailUnreachable, reason } = req.body;
    user.emailUnreachable = !!emailUnreachable;
    user.emailUnreachableAt = emailUnreachable ? new Date() : undefined;
    user.emailUnreachableReason = emailUnreachable ? (reason || '') : undefined;
    await user.save();
    res.json({
      message: emailUnreachable ? 'Email marked as unreachable. No further emails will be sent.' : 'Email marked as reachable again.',
      user: { _id: user._id, email: user.email, emailUnreachable: user.emailUnreachable, emailUnreachableAt: user.emailUnreachableAt, emailUnreachableReason: user.emailUnreachableReason }
    });
  } catch (error) {
    console.error('Update email unreachable error:', error);
    res.status(500).json({ error: 'Failed to update email unreachable status' });
  }
});

// @route   GET /api/admin/users/:id/payments
// @desc    Get user's payment history (admin only)
// @access  Private (Admin)
router.get('/users/:id/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email');
    
    res.json(payments);
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({ error: 'Failed to fetch user payments' });
  }
});

// @route   GET /api/admin/users/:id/withdrawals
// @desc    Get user's withdrawal history (admin only)
// @access  Private (Admin)
router.get('/users/:id/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('processedBy', 'firstName lastName');
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch user withdrawals' });
  }
});

// @route   GET /api/admin/users/:id/referrals
// @desc    Get user's referrals (admin only)
// @access  Private (Admin)
router.get('/users/:id/referrals', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find users who were referred by this user
    const referrals = await User.find({ 
      parentReferralCode: user.referralCode 
    })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(referrals);
  } catch (error) {
    console.error('Get user referrals error:', error);
    res.status(500).json({ error: 'Failed to fetch user referrals' });
  }
});

// @route   GET /api/admin/users/:id/referral-tree
// @desc    Get user's complete referral tree (admin only)
// @access  Private (Admin)
router.get('/users/:id/referral-tree', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Recursive function to build referral tree
    async function buildReferralTree(userCode, level = 0, maxLevel = 5) {
      if (level >= maxLevel) return []; // Prevent infinite recursion
      
      const directReferrals = await User.find({ 
        parentReferralCode: userCode 
      })
        .select('firstName lastName email referralCode isActive isVerified balance createdAt')
        .sort({ createdAt: -1 })
        .lean();

      const referralsWithChildren = await Promise.all(
        directReferrals.map(async (referral) => {
          const children = await buildReferralTree(referral.referralCode, level + 1, maxLevel);
          return {
            ...referral,
            level: level + 1,
            children,
            childrenCount: children.length,
            totalDescendants: children.reduce((sum, child) => sum + child.totalDescendants + 1, children.length)
          };
        })
      );

      return referralsWithChildren;
    }

    const tree = await buildReferralTree(user.referralCode);
    
    // Calculate stats
    const stats = {
      totalReferrals: tree.length,
      totalDescendants: tree.reduce((sum, child) => sum + child.totalDescendants + 1, tree.length),
      activeReferrals: tree.filter(r => r.isActive).length,
      verifiedReferrals: tree.filter(r => r.isVerified).length
    };

    res.json({
      tree,
      stats,
      rootUser: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Get user referral tree error:', error);
    res.status(500).json({ error: 'Failed to fetch user referral tree' });
  }
});

// @route   GET /api/admin/users/:id/transactions
// @desc    Get user's balance transaction history (admin only)
// @access  Private (Admin)
router.get('/users/:id/transactions', async (req, res) => {
  try {
    const { limit, skip, type } = req.query;
    const transactions = await BalanceTransaction.getUserTransactions(req.params.id, {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      type
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// @route   POST /api/admin/users/:id/credit
// @desc    Credit balance to user (admin only)
// @access  Private (Admin)
router.post('/users/:id/credit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'credit',
      amount: parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send email to user about balance credit
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance_credited', {
      amount: parseFloat(amount),
      currency: 'USDT',
      description: description,
      transactionId: transaction._id.toString(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    res.json({
      success: true,
      message: 'Balance credited successfully',
      transaction
    });

  } catch (error) {
    console.error('Credit balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to credit balance' 
    });
  }
});

// @route   POST /api/admin/users/:id/debit
// @desc    Debit balance from user (admin only)
// @access  Private (Admin)
router.post('/users/:id/debit', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user.balance || 0) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'debit',
      amount: -parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance', {
      title: 'Balance Debited',
      message: `$${amount} USDT has been debited from your account. ${description}`,
      transactionId: transaction._id
    });

    res.json({
      success: true,
      message: 'Balance debited successfully',
      transaction
    });

  } catch (error) {
    console.error('Debit balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to debit balance' 
    });
  }
});

// @route   POST /api/admin/users/:id/bonus
// @desc    Send bonus to user (admin only)
// @access  Private (Admin)
router.post('/users/:id/bonus', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, notes } = req.body;
    
    const transaction = await BalanceTransaction.createTransaction({
      user: req.params.id,
      type: 'bonus',
      amount: parseFloat(amount),
      description,
      performedBy: req.user._id,
      notes
    });

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(req.params.id, 'balance', {
      title: 'Bonus Received!',
      message: `Congratulations! You've received a bonus of $${amount} USDT. ${description}`,
      transactionId: transaction._id
    });

    res.json({
      success: true,
      message: 'Bonus sent successfully',
      transaction
    });

  } catch (error) {
    console.error('Send bonus error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to send bonus' 
    });
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

// @route   PUT /api/admin/users/:id/balance
// @desc    Update user balance (admin only)
// @access  Private (Admin)
router.put('/users/:id/balance', [
  body('balance').isFloat({ min: 0 }).withMessage('Balance must be a positive number'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { balance, reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldBalance = user.balance || 0;
    user.balance = balance;
    await user.save();

    // Log the balance change (optional - you could create a BalanceHistory model)
    console.log(`Admin ${req.user._id} updated balance for user ${user._id}: ${oldBalance} -> ${balance}. Reason: ${reason || 'No reason provided'}`);

    res.json({
      success: true,
      message: 'User balance updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        oldBalance
      }
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to update balance' 
    });
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

// @route   POST /api/admin/users/:id/unblock
// @desc    Unblock a user locked due to failed login attempts (admin only)
// @access  Private (Admin)
router.post('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wasLocked = user.security?.isLocked || (user.security?.lockedUntil && new Date(user.security.lockedUntil) > new Date());
    if (!wasLocked) {
      return res.status(400).json({ error: 'Account is not locked', message: 'This account is not currently locked.' });
    }

    // Clear lock in database
    await User.findByIdAndUpdate(req.params.id, {
      $unset: {
        'security.isLocked': 1,
        'security.lockedUntil': 1,
        'security.lockReason': 1
      },
      $set: {
        'security.failedLoginAttempts': 0
      }
    });

    // Clear in-memory failed attempts for this email (all IPs)
    clearFailedAttemptsByEmail(user.email);

    const updatedUser = await User.findById(req.params.id).select('-password');
    res.json({ message: 'Account unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
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

// @route   DELETE /api/admin/payments
// @desc    Delete multiple payments (bulk delete) (admin only)
// @access  Private (Admin)
// Note: This route must come before /payments/:id to avoid routing conflicts
router.delete('/payments', async (req, res) => {
  console.log('[Bulk Delete Payments] Route hit:', req.method, req.path);
  console.log('[Bulk Delete Payments] Body:', req.body);
  console.log('[Bulk Delete Payments] Headers:', req.headers);
  
  try {
    const { paymentIds } = req.body;
    
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: 'No payment IDs provided or invalid format' });
    }

    // Validate that all IDs are valid MongoDB ObjectIds
    const mongoose = require('mongoose');
    const invalidIds = paymentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid payment IDs: ${invalidIds.join(', ')}` });
    }

    console.log('[Bulk Delete Payments] Deleting payment IDs:', paymentIds);
    const result = await Payment.deleteMany({ _id: { $in: paymentIds } });
    
    console.log('[Bulk Delete Payments] Deleted count:', result.deletedCount);
    res.json({ 
      message: `${result.deletedCount} payment(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete payments error:', error);
    res.status(500).json({ error: 'Failed to delete payments' });
  }
});

// @route   DELETE /api/admin/payments/:id
// @desc    Delete payment (admin only)
// @access  Private (Admin)
router.delete('/payments/:id', async (req, res) => {
  console.log('[Delete Single Payment] Route hit:', req.method, req.path);
  console.log('[Delete Single Payment] ID:', req.params.id);
  
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await Payment.findByIdAndDelete(req.params.id);
    
    console.log('[Delete Single Payment] Successfully deleted payment:', req.params.id);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
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
        maintenanceMode: settings.maintenanceMode,
        maintenanceAllowTeachers: settings.maintenanceAllowTeachers || false
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

// @route   GET /api/admin/withdrawals
// @desc    Get all withdrawal requests (admin only)
// @access  Private (Admin)
router.get('/withdrawals', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'firstName lastName email balance')
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// @route   DELETE /api/admin/withdrawals
// @desc    Bulk delete withdrawal requests (admin only)
// @access  Private (Admin)
router.delete('/withdrawals', async (req, res) => {
  try {
    const { withdrawalIds } = req.body;
    
    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return res.status(400).json({ error: 'Withdrawal IDs are required' });
    }

    let deletedCount = 0;
    let refundedAmount = 0;

    for (const withdrawalId of withdrawalIds) {
      const withdrawal = await Withdrawal.findById(withdrawalId).populate('user');
      
      if (!withdrawal) {
        console.log(`[Bulk Delete] Withdrawal ${withdrawalId} not found, skipping`);
        continue;
      }

      // If withdrawal is pending, refund the balance to user
      if (withdrawal.status === 'pending') {
        const user = await User.findById(withdrawal.user._id);
        if (user) {
          user.balance += withdrawal.amount;
          await user.save();
          refundedAmount += withdrawal.amount;
          console.log(`[Bulk Delete] Refunded $${withdrawal.amount} to user ${user.email}`);
        }
      }

      // Delete the withdrawal
      await Withdrawal.findByIdAndDelete(withdrawalId);
      deletedCount++;
      console.log(`[Bulk Delete] Deleted withdrawal ${withdrawalId}`);
    }

    res.json({
      success: true,
      message: `${deletedCount} withdrawal(s) deleted successfully`,
      deletedCount,
      refundedAmount
    });

  } catch (error) {
    console.error('Bulk delete withdrawals error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete withdrawals' 
    });
  }
});

// @route   DELETE /api/admin/withdrawals/:id
// @desc    Delete withdrawal request (admin only)
// @access  Private (Admin)
// NOTE: This route must be registered AFTER /withdrawals (bulk delete) to avoid route conflicts
router.delete('/withdrawals/:id', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // If withdrawal is pending, refund the balance to user
    if (withdrawal.status === 'pending') {
      const user = await User.findById(withdrawal.user._id);
      if (user) {
        user.balance += withdrawal.amount;
        await user.save();
        console.log(`[Delete Withdrawal] Refunded $${withdrawal.amount} to user ${user.email}`);
      }
    }

    // Delete the withdrawal
    await Withdrawal.findByIdAndDelete(req.params.id);
    console.log(`[Delete Withdrawal] Deleted withdrawal ${req.params.id}`);

    res.json({
      success: true,
      message: 'Withdrawal deleted successfully'
    });

  } catch (error) {
    console.error('Delete withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete withdrawal' 
    });
  }
});

// @route   POST /api/admin/withdrawals/:id/complete
// @desc    Complete withdrawal (admin only)
// @access  Private (Admin)
router.post('/withdrawals/:id/complete', [
  body('transactionHash').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionHash, notes } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status === 'completed') {
      return res.status(400).json({ error: 'Withdrawal already completed' });
    }

    // Complete withdrawal
    if (transactionHash) {
      withdrawal.transactionHash = transactionHash;
    }
    await withdrawal.complete(transactionHash);

    // Send email to user about withdrawal confirmation
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(withdrawal.user._id, 'withdrawal_confirmed', {
      amount: withdrawal.amount,
      currency: withdrawal.currency || 'USDT',
      transactionHash: transactionHash || 'N/A',
      withdrawalId: withdrawal._id.toString(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    });

    res.json({
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Complete withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to complete withdrawal' 
    });
  }
});

// @route   POST /api/admin/withdrawals/:id/reject
// @desc    Reject withdrawal (admin only)
// @access  Private (Admin)
router.post('/withdrawals/:id/reject', [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Reject withdrawal
    await withdrawal.reject(req.user._id, reason);

    // Refund balance to user
    const user = await User.findById(withdrawal.user._id);
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
    }

    // Send notification to user
    const notificationService = require('../services/notificationService');
    await notificationService.sendNotificationToUser(withdrawal.user._id, 'withdrawal', {
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request of $${withdrawal.amount} USDT has been rejected. Reason: ${reason}`,
      withdrawalId: withdrawal._id
    });

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to reject withdrawal' 
    });
  }
});

// @route   GET /api/admin/commissions
// @desc    Get all commission distributions (admin only)
// @access  Private (Admin)
router.get('/commissions', async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      level, 
      packageName, 
      startDate, 
      endDate,
      referrerId,
      buyerId
    } = req.query;
    
    const query = { type: 'referral_commission' };
    
    // Filter by level
    if (level) {
      query['metadata.level'] = level.toString();
    }
    
    // Filter by package name
    if (packageName) {
      query['metadata.packageName'] = packageName;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Filter by referrer
    if (referrerId) {
      query.user = referrerId;
    }
    
    // Filter by buyer (from metadata)
    if (buyerId) {
      // This would require a different approach - we'd need to check metadata
      // For now, we'll filter after fetching
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get commissions with populated user and payment info
    const commissions = await BalanceTransaction.find(query)
      .populate('user', 'firstName lastName email referralCode')
      .populate('relatedPayment', 'package finalAmount status createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // If buyerId filter is provided, filter by metadata
    let filteredCommissions = commissions;
    if (buyerId) {
      filteredCommissions = commissions.filter(c => 
        c.metadata && c.metadata.buyerEmail && 
        c.metadata.buyerEmail.toLowerCase().includes(buyerId.toLowerCase())
      );
    }
    
    // Get total count for pagination
    const totalQuery = { ...query };
    if (buyerId) {
      // For buyer filter, we need to count after filtering
      const allCommissions = await BalanceTransaction.find(query)
        .populate('user', 'firstName lastName email')
        .lean();
      const filtered = allCommissions.filter(c => 
        c.metadata && c.metadata.buyerEmail && 
        c.metadata.buyerEmail.toLowerCase().includes(buyerId.toLowerCase())
      );
      var total = filtered.length;
    } else {
      var total = await BalanceTransaction.countDocuments(query);
    }
    
    // Calculate summary statistics
    const totalCommissions = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    // Get commissions by level
    const byLevel = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: '$metadata.level',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get commissions by package
    const byPackage = await BalanceTransaction.aggregate([
      { $match: { type: 'referral_commission' } },
      {
        $group: {
          _id: '$metadata.packageName',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    res.json({
      commissions: filteredCommissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total: totalCommissions[0] || { totalAmount: 0, totalCount: 0, avgAmount: 0 },
        byLevel: byLevel.map(item => ({
          level: item._id || 'Unknown',
          totalAmount: item.totalAmount,
          count: item.count
        })),
        byPackage: byPackage.map(item => ({
          packageName: item._id || 'Unknown',
          totalAmount: item.totalAmount,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// @route   GET /api/admin/platform-commissions
// @desc    Get platform commissions (company share from all payments)
// @access  Private (Admin)
router.get('/platform-commissions', async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      packageName, 
      startDate, 
      endDate
    } = req.query;
    
    console.log('[Platform Commissions] Fetching platform commissions with filters:', {
      limit, page, packageName, startDate, endDate
    });
    
    // Query for completed package payments
    // Note: Payments are marked as 'completed' when admin confirms them
    const query = { 
      type: 'package',
      status: 'completed'
    };
    
    // Also check if there are any package payments at all (for debugging)
    const allPackagePayments = await Payment.find({ type: 'package' }).select('status package.name finalAmount amount adminConfirmed').lean();
    console.log('[Platform Commissions] All package payments (any status):', allPackagePayments.length);
    if (allPackagePayments.length > 0) {
      console.log('[Platform Commissions] Sample payments:', allPackagePayments.slice(0, 5).map(p => ({
        _id: p._id,
        status: p.status,
        adminConfirmed: p.adminConfirmed,
        packageName: p.package?.name,
        amount: p.finalAmount || p.amount
      })));
      
      const completedPayments = allPackagePayments.filter(p => p.status === 'completed');
      console.log('[Platform Commissions] Completed package payments:', completedPayments.length);
    }
    
    // Filter by package name
    if (packageName) {
      query['package.name'] = packageName;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    console.log('[Platform Commissions] Query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get completed package payments
    const payments = await Payment.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    console.log(`[Platform Commissions] Found ${payments.length} payments`);
    
    // Calculate platform commission for each payment
    const ReferralCommissionService = require('../services/referralCommissionService');
    const commissionService = new ReferralCommissionService();
    
    const platformCommissions = payments.map(payment => {
      const packageName = payment.package?.name || 'Unknown';
      const packageAmount = payment.finalAmount || payment.amount || 0;
      const referralPool = commissionService.getReferralPool(packageName, packageAmount);
      const companyShare = commissionService.getCompanyShare(packageName, packageAmount);
      
      console.log(`[Platform Commissions] Payment ${payment._id}:`, {
        packageName,
        packageAmount,
        referralPool,
        companyShare
      });
      
      return {
        _id: payment._id,
        paymentId: payment._id,
        user: payment.user || { firstName: 'Unknown', lastName: '', email: '' },
        package: payment.package || { name: 'Unknown', price: 0 },
        packageAmount: packageAmount,
        referralPool: referralPool,
        platformCommission: companyShare,
        referralPoolPercentage: commissionService.packageReferralPools[commissionService.normalizePackageName(packageName)] * 100 || 0,
        platformCommissionPercentage: (1 - (commissionService.packageReferralPools[commissionService.normalizePackageName(packageName)] || 0)) * 100,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt
      };
    });
    
    // Get total count for pagination
    const total = await Payment.countDocuments(query);
    console.log(`[Platform Commissions] Total payments: ${total}`);
    
    // Calculate summary statistics
    const allPayments = await Payment.find({ 
      type: 'package',
      status: 'completed'
    }).lean();
    
    console.log(`[Platform Commissions] All payments for stats: ${allPayments.length}`);
    
    let totalPlatformCommission = 0;
    let totalReferralPool = 0;
    let totalPackageAmount = 0;
    const byPackage = {};
    
    allPayments.forEach(payment => {
      const pkgName = payment.package?.name || 'Unknown';
      const pkgAmount = payment.finalAmount || payment.amount || 0;
      const refPool = commissionService.getReferralPool(pkgName, pkgAmount);
      const companyShare = commissionService.getCompanyShare(pkgName, pkgAmount);
      
      totalPlatformCommission += companyShare;
      totalReferralPool += refPool;
      totalPackageAmount += pkgAmount;
      
      if (!byPackage[pkgName]) {
        byPackage[pkgName] = { totalAmount: 0, platformCommission: 0, referralPool: 0, count: 0 };
      }
      byPackage[pkgName].totalAmount += pkgAmount;
      byPackage[pkgName].platformCommission += companyShare;
      byPackage[pkgName].referralPool += refPool;
      byPackage[pkgName].count += 1;
    });
    
    console.log(`[Platform Commissions] Returning ${platformCommissions.length} commissions`);
    
    res.json({
      commissions: platformCommissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total: {
          totalPlatformCommission: Math.round(totalPlatformCommission * 100) / 100,
          totalReferralPool: Math.round(totalReferralPool * 100) / 100,
          totalPackageAmount: Math.round(totalPackageAmount * 100) / 100,
          totalCount: allPayments.length
        },
        byPackage: Object.entries(byPackage).map(([name, data]) => ({
          packageName: name,
          totalAmount: Math.round(data.totalAmount * 100) / 100,
          platformCommission: Math.round(data.platformCommission * 100) / 100,
          referralPool: Math.round(data.referralPool * 100) / 100,
          count: data.count
        }))
      }
    });
  } catch (error) {
    console.error('[Platform Commissions] Error:', error);
    console.error('[Platform Commissions] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch platform commissions',
      message: error.message 
    });
  }
});

module.exports = router;
