const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralCommission = require('../models/ReferralCommission');
const Payment = require('../models/Payment');
const notificationService = require('./notificationService');

class ReferralService {
  /**
   * Generate unique referral code for a user
   * @param {Object} user - User object
   * @returns {Promise<String>} Referral code
   */
  async generateReferralCode(user) {
    if (user.referralCode) {
      return user.referralCode;
    }

    const code = await User.generateReferralCode();
    user.referralCode = code;
    await user.save();
    return code;
  }

  /**
   * Create referral relationship when user signs up with referral code
   * @param {Object} newUser - New user object
   * @param {String} referralCode - Referral code used
   * @returns {Promise<Object>} Referral relationship
   */
  async createReferralRelationship(newUser, referralCode) {
    if (!referralCode) {
      return null;
    }

    // Find referrer
    const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    // Prevent self-referral
    if (referrer._id.toString() === newUser._id.toString()) {
      throw new Error('Cannot refer yourself');
    }

    // Set parent referral code
    newUser.parentReferralCode = referrer.referralCode;
    await newUser.save();

    // Build referral tree and create relationships for all levels
    const referralTree = await this.buildReferralTree(newUser, referrer);
    
    // Create referral records for each level
    const referralRecords = [];
    for (const levelData of referralTree) {
      const referral = new Referral({
        user: newUser._id,
        referrer: levelData.referrer._id,
        level: levelData.level,
        referralCode: newUser.referralCode,
        parentReferralCode: levelData.referrer.referralCode
      });
      await referral.save();
      referralRecords.push(referral);

      // Update referrer stats
      await this.updateReferrerStats(levelData.referrer, levelData.level);
    }

    // Send notification to referrer
    try {
      await notificationService.createNotification({
        user: referrer._id,
        type: 'referral',
        title: 'New Referral!',
        message: `${newUser.firstName} ${newUser.lastName} joined using your referral code`,
        link: `/referrals`
      });
    } catch (error) {
      console.error('Error sending referral notification:', error);
    }

    return referralRecords;
  }

  /**
   * Build referral tree up to 5 levels
   * @param {Object} newUser - New user
   * @param {Object} directReferrer - Direct referrer
   * @returns {Promise<Array>} Array of referrers by level
   */
  async buildReferralTree(newUser, directReferrer) {
    const tree = [];
    let currentReferrer = directReferrer;
    let level = 1;

    while (currentReferrer && level <= 5) {
      tree.push({
        referrer: currentReferrer,
        level: level
      });

      // Move to next level
      if (currentReferrer.parentReferralCode) {
        currentReferrer = await User.findOne({ 
          referralCode: currentReferrer.parentReferralCode 
        });
        level++;
      } else {
        break;
      }
    }

    return tree;
  }

  /**
   * Update referrer statistics
   * @param {Object} referrer - Referrer user object
   * @param {Number} level - Referral level
   */
  async updateReferrerStats(referrer, level) {
    if (!referrer.referralStats) {
      referrer.referralStats = {
        totalReferrals: 0,
        totalEarnings: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        level4Count: 0,
        level5Count: 0
      };
    }

    referrer.referralStats.totalReferrals += 1;
    referrer.referralStats[`level${level}Count`] += 1;
    await referrer.save();
  }

  /**
   * Calculate and distribute referral commissions for a payment
   * @param {Object} payment - Payment object
   * @returns {Promise<Array>} Array of created commission records
   */
  async calculateAndDistributeCommissions(payment) {
    // Only calculate commissions for package purchases
    if (payment.status !== 'completed' || payment.type !== 'package') {
      return [];
    }

    // Verify it's one of the 3 packages
    const validPackages = ['FX Launch', 'FX Scale', 'FX Legacy'];
    if (!payment.package || !payment.package.name || !validPackages.includes(payment.package.name)) {
      return [];
    }

    const purchaser = await User.findById(payment.user);
    if (!purchaser || !purchaser.parentReferralCode) {
      return [];
    }

    const commissions = [];
    let currentUser = purchaser;
    let level = 1;
    const maxLevel = 5;

    // Traverse up the referral tree
    while (currentUser && currentUser.parentReferralCode && level <= maxLevel) {
      const referrer = await User.findOne({ 
        referralCode: currentUser.parentReferralCode 
      });

      if (!referrer) {
        break;
      }

      // Calculate commission
      const commissionRate = ReferralCommission.COMMISSION_RATES[level];
      const commissionAmount = ReferralCommission.calculateCommission(
        payment.finalAmount,
        level
      );

      // Create commission record
      const commission = new ReferralCommission({
        payment: payment._id,
        purchaser: purchaser._id,
        referrer: referrer._id,
        level: level,
        purchaseAmount: payment.finalAmount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        currency: payment.currency,
        status: 'pending'
      });

      await commission.save();
      commissions.push(commission);

      // Update referrer earnings
      referrer.referralStats.totalEarnings += commissionAmount;
      await referrer.save();

      // Send notification to referrer
      try {
        await notificationService.createNotification({
          user: referrer._id,
          type: 'commission',
          title: 'Commission Earned!',
          message: `You earned ${commissionAmount} ${payment.currency} commission from ${purchaser.firstName}'s purchase (Level ${level})`,
          link: `/referrals/earnings`
        });
      } catch (error) {
        console.error('Error sending commission notification:', error);
      }

      // Move to next level
      currentUser = referrer;
      level++;
    }

    return commissions;
  }

  /**
   * Get referral tree for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Referral tree data
   */
  async getReferralTree(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get direct referrals (Level 1)
    const directReferrals = await Referral.find({ 
      referrer: userId, 
      level: 1 
    }).populate('user', 'firstName lastName email referralCode createdAt');

    // Build tree recursively
    const buildTree = async (referrals, currentLevel = 1) => {
      if (currentLevel > 5 || referrals.length === 0) {
        return [];
      }

      const tree = [];
      for (const referral of referrals) {
        const userData = referral.user;
        const childReferrals = await Referral.find({ 
          referrer: userData._id, 
          level: 1 
        }).populate('user', 'firstName lastName email referralCode createdAt');

        tree.push({
          user: {
            id: userData._id,
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            referralCode: userData.referralCode,
            joinedAt: userData.createdAt
          },
          level: currentLevel,
          children: await buildTree(childReferrals, currentLevel + 1)
        });
      }

      return tree;
    };

    const tree = await buildTree(directReferrals);

    return {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        referralCode: user.referralCode
      },
      stats: user.referralStats || {
        totalReferrals: 0,
        totalEarnings: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        level4Count: 0,
        level5Count: 0
      },
      tree: tree
    };
  }

  /**
   * Get referral earnings for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options (limit, offset, status)
   * @returns {Promise<Object>} Earnings data
   */
  async getReferralEarnings(userId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    const query = { referrer: userId };
    if (status) {
      query.status = status;
    }

    const commissions = await ReferralCommission.find(query)
      .populate('payment', 'finalAmount currency type createdAt')
      .populate('purchaser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    const totalEarnings = await ReferralCommission.aggregate([
      { $match: { referrer: userId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);

    const earningsByLevel = await ReferralCommission.aggregate([
      { $match: { referrer: userId, status: 'paid' } },
      {
        $group: {
          _id: '$level',
          total: { $sum: '$commissionAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      commissions: commissions,
      totalEarnings: totalEarnings[0]?.total || 0,
      earningsByLevel: earningsByLevel.reduce((acc, item) => {
        acc[`level${item._id}`] = {
          total: item.total,
          count: item.count
        };
        return acc;
      }, {}),
      pendingEarnings: await ReferralCommission.countDocuments({ 
        referrer: userId, 
        status: 'pending' 
      })
    };
  }

  /**
   * Mark commissions as paid
   * @param {Array} commissionIds - Array of commission IDs
   * @returns {Promise<Number>} Number of updated commissions
   */
  async markCommissionsAsPaid(commissionIds) {
    const result = await ReferralCommission.updateMany(
      { _id: { $in: commissionIds } },
      { 
        status: 'paid',
        paidAt: new Date()
      }
    );

    return result.modifiedCount;
  }
}

module.exports = new ReferralService();
