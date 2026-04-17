const express = require('express');
const { body, validationResult } = require('express-validator');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const mongoose = require('mongoose');
const BalanceTransaction = require('../models/BalanceTransaction');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// @route   POST /api/withdrawals/request
// @desc    Create withdrawal request
// @access  Private
router.post('/request', [
  authenticateToken,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('walletAddress').trim().notEmpty().withMessage('Wallet address is required'),
  body('network').optional().isIn(['TRC20', 'ERC20', 'BEP20']).withMessage('Invalid network')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, walletAddress, network = 'TRC20' } = req.body;

    // Minimum withdrawal limit
    const MIN_WITHDRAWAL_AMOUNT = 30;
    if (amount < MIN_WITHDRAWAL_AMOUNT) {  
      return res.status(400).json({ 
        error: 'Minimum withdrawal limit',
        message: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}. You cannot withdraw $${amount.toFixed(2)}`
      });
    }

    const session = await mongoose.startSession();
    let withdrawal;
    let user;

    await session.withTransaction(async () => {
      // Get user with balance (inside txn)
      user = await User.findById(req.user._id).session(session);
      if (!user) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
      }

      // Check if user has sufficient balance
      if ((user.balance || 0) < amount) {
        throw Object.assign(new Error('Insufficient balance'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE', balance: user.balance || 0 });
      }

      // Create withdrawal request
      withdrawal = await Withdrawal.create([{
        user: req.user._id,
        amount,
        currency: 'USDT',
        walletAddress,
        network,
        status: 'pending'
      }], { session }).then((docs) => docs[0]);

      // Deduct balance atomically + record transaction
      const balanceBefore = user.balance || 0;
      const balanceAfter = balanceBefore - amount;
      user.balance = balanceAfter;
      await user.save({ session });

      await BalanceTransaction.create([{
        user: user._id,
        type: 'withdrawal',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description: 'Withdrawal requested',
        relatedWithdrawal: withdrawal._id,
        metadata: new Map([
          ['network', String(network)],
          ['walletAddress', String(walletAddress)]
        ])
      }], { session });
    });
    session.endSession();

    // Send notification to all admins
    const admins = await User.find({ role: 'admin' });
    const adminIds = admins.map(admin => admin._id.toString());
    
    await notificationService.sendBulkNotification(adminIds, 'withdrawal_request', {
      title: 'New Withdrawal Request',
      message: `${user.firstName} ${user.lastName} requested withdrawal of $${amount} USDT`,
      withdrawalId: withdrawal._id,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      amount,
      walletAddress
    });

    // Send email to user about withdrawal request
    await notificationService.sendNotificationToUser(user._id, 'withdrawal_request', {
      amount: amount,
      currency: 'USDT',
      walletAddress: walletAddress,
      network: network,
      withdrawalId: withdrawal._id.toString()
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Admin will process it shortly.',
      withdrawal
    });

  } catch (error) {
    console.error('Create withdrawal request error:', error);
    if (error && error.statusCode === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error && error.statusCode === 400 && error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: `Your balance is $${Number(error.balance || 0).toFixed(2)}. You cannot withdraw $${amount.toFixed(2)}`
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create withdrawal request'
    });
  }
});

// @route   GET /api/withdrawals/user
// @desc    Get user's withdrawal requests
// @access  Private
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.findByUser(req.user._id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// @route   GET /api/withdrawals
// @desc    Get all withdrawal requests (admin only)
// @access  Private/Admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// @route   GET /api/withdrawals/:id
// @desc    Get withdrawal by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName email');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    // Check if user owns the withdrawal or is admin
    if (withdrawal.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(withdrawal);
  } catch (error) {
    console.error('Get withdrawal error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal' });
  }
});

// @route   POST /api/withdrawals/:id/complete
// @desc    Complete withdrawal (admin only)
// @access  Private/Admin
router.post('/:id/complete', [
  authenticateToken,
  requireAdmin,
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

    // Complete withdrawal
    if (transactionHash) {
      withdrawal.transactionHash = transactionHash;
    }
    await withdrawal.complete(transactionHash);

    // Send email to user about withdrawal confirmation
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

// @route   POST /api/withdrawals/:id/reject
// @desc    Reject withdrawal (admin only)
// @access  Private/Admin
router.post('/:id/reject', [
  authenticateToken,
  requireAdmin,
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

    // Refund balance to user and record transaction
    const user = await User.findById(withdrawal.user._id);
    if (user) {
      const balanceBefore = user.balance || 0;
      const balanceAfter = balanceBefore + withdrawal.amount;
      user.balance = balanceAfter;
      await user.save();
      await BalanceTransaction.createTransaction({
        user: user._id,
        type: 'adjustment',
        amount: withdrawal.amount,
        description: 'Withdrawal refunded (rejected)',
        performedBy: req.user._id,
        relatedWithdrawal: withdrawal._id,
        notes: reason,
        metadata: new Map([['status', 'rejected']])
      });
    }

    // Send notification to user
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

// @route   DELETE /api/withdrawals/:id
// @desc    Delete withdrawal request (admin only)
// @access  Private/Admin
// NOTE: This route must be registered BEFORE /:id/cancel to avoid route conflicts
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // If withdrawal is pending, refund the balance to user
    if (withdrawal.status === 'pending') {
      const user = await User.findById(withdrawal.user._id);
      if (user) {
        const balanceBefore = user.balance || 0;
        user.balance = balanceBefore + withdrawal.amount;
        await user.save();
        await BalanceTransaction.createTransaction({
          user: user._id,
          type: 'adjustment',
          amount: withdrawal.amount,
          description: 'Withdrawal refunded (admin deleted pending request)',
          performedBy: req.user._id,
          relatedWithdrawal: withdrawal._id,
          notes: 'Pending withdrawal deleted by admin',
          metadata: new Map([['status', 'deleted']])
        });
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

// @route   POST /api/withdrawals/:id/cancel
// @desc    Cancel withdrawal (user only, pending withdrawals)
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Check if user owns the withdrawal
    if (withdrawal.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cancel withdrawal
    await withdrawal.cancel();

    // Refund balance to user and record transaction
    const user = await User.findById(req.user._id);
    if (user) {
      const balanceBefore = user.balance || 0;
      user.balance = balanceBefore + withdrawal.amount;
      await user.save();
      await BalanceTransaction.createTransaction({
        user: user._id,
        type: 'adjustment',
        amount: withdrawal.amount,
        description: 'Withdrawal refunded (cancelled by user)',
        relatedWithdrawal: withdrawal._id,
        notes: 'User cancelled pending withdrawal',
        metadata: new Map([['status', 'cancelled']])
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal cancelled successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to cancel withdrawal' 
    });
  }
});

module.exports = router;
