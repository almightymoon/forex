const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralCommission = require('../models/ReferralCommission');
const Payment = require('../models/Payment');
const notificationService = require('./notificationService');

/** Ranks based on total referrals (all levels). Verified = has purchased a package. */
const REFERRAL_RANKS = [
  { minReferrals: 0, name: 'Starter', icon: '🌱', color: '#94a3b8', description: 'Just getting started' },
  { minReferrals: 5, name: 'Bronze', icon: '🥉', color: '#cd7f32', description: '5+ referrals' },
  { minReferrals: 10, name: 'Silver', icon: '🥈', color: '#c0c0c0', description: '10+ referrals' },
  { minReferrals: 25, name: 'Gold', icon: '🥇', color: '#ffd700', description: '25+ referrals' },
  { minReferrals: 50, name: 'Platinum', icon: '💎', color: '#e5e4e2', description: '50+ referrals' },
  { minReferrals: 100, name: 'Diamond', icon: '👑', color: '#b9f2ff', description: '100+ referrals' }
];

class ReferralService {
  /**
   * Get Set of user IDs who have at least one completed package payment (verified referrals).
   * @returns {Promise<Set<string>>}
   */
  async getVerifiedReferralUserIds() {
    const ids = await Payment.distinct('user', {
      type: 'package',
      status: 'completed'
    });
    return new Set(ids.map((id) => id.toString()));
  }

  /**
   * Get rank info for a given total referral count.
   * @param {number} totalReferrals
   * @returns {{ current: object, next: object | null, progressToNext: number }}
   */
  getReferralRank(totalReferrals) {
    const n = Math.max(0, totalReferrals);
    let current = REFERRAL_RANKS[0];
    let next = null;
    for (let i = REFERRAL_RANKS.length - 1; i >= 0; i--) {
      if (n >= REFERRAL_RANKS[i].minReferrals) {
        current = REFERRAL_RANKS[i];
        next = REFERRAL_RANKS[i + 1] || null;
        break;
      }
    }
    let progressToNext = 1;
    if (next) {
      const range = next.minReferrals - current.minReferrals;
      const progress = n - current.minReferrals;
      progressToNext = range > 0 ? Math.min(1, Math.max(0, progress / range)) : 1;
    }
    return { current, next, progressToNext };
  }

  /**
   * Flatten tree into array of nodes (each with level, user, verified, etc.).
   * @param {Array} nodes
   * @returns {Array}
   */
  flattenTree(nodes) {
    if (!nodes || !Array.isArray(nodes)) return [];
    const out = [];
    for (const node of nodes) {
      out.push(node);
      if (node.children && node.children.length) {
        out.push(...this.flattenTree(node.children));
      }
    }
    return out;
  }
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
        verifiedReferrals: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        level4Count: 0,
        level5Count: 0
      };
    }
    if (typeof referrer.referralStats.verifiedReferrals !== 'number') {
      referrer.referralStats.verifiedReferrals = 0;
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

    const verifiedSet = await this.getVerifiedReferralUserIds();

    async function buildReferralTree(userCode, level = 0, maxLevel = 5) {
      if (level >= maxLevel || !userCode) return [];
      const normalizedCode = String(userCode).toUpperCase().trim();

      const allUsersWithParent = await User.find({}).select('firstName lastName parentReferralCode referralCode').lean();
      const matchingUsers = allUsersWithParent.filter(u =>
        u.parentReferralCode && String(u.parentReferralCode).toUpperCase().trim() === normalizedCode
      );

      let directReferrals = await User.find({ parentReferralCode: normalizedCode })
        .select('firstName lastName email referralCode isActive isVerified balance createdAt parentReferralCode')
        .sort({ createdAt: -1 })
        .lean();

      if (directReferrals.length === 0 && matchingUsers.length > 0) {
        const regexCode = new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        directReferrals = await User.find({ parentReferralCode: { $regex: regexCode } })
          .select('firstName lastName email referralCode isActive isVerified balance createdAt parentReferralCode')
          .sort({ createdAt: -1 })
          .lean();
      }

      const referralsWithChildren = await Promise.all(
        directReferrals.map(async (referral) => {
          const children = await buildReferralTree(referral.referralCode, level + 1, maxLevel);
          const verified = verifiedSet.has(referral._id.toString());
          return {
            ...referral,
            verified,
            level: level + 1,
            children,
            childrenCount: children.length,
            totalDescendants: children.reduce((sum, child) => sum + (child.totalDescendants || 0) + 1, children.length),
            user: {
              id: referral._id.toString(),
              name: `${referral.firstName} ${referral.lastName}`,
              email: referral.email,
              referralCode: referral.referralCode,
              joinedAt: referral.createdAt,
              verified
            }
          };
        })
      );

      return referralsWithChildren;
    }

    if (!user.referralCode) {
      const rank = this.getReferralRank(0);
      return {
        user: {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          referralCode: ''
        },
        stats: {
          totalReferrals: 0,
          totalDescendants: 0,
          activeReferrals: 0,
          verifiedReferrals: 0,
          unverifiedReferrals: 0,
          rank: rank
        },
        tree: []
      };
    }

    const tree = await buildReferralTree(user.referralCode);
    const flat = this.flattenTree(tree);
    const totalReferrals = flat.length;
    const verifiedCount = flat.filter((n) => n.verified).length;
    const unverifiedCount = totalReferrals - verifiedCount;
    const totalDescendants = tree.reduce((sum, child) => sum + (child.totalDescendants || 0) + 1, tree.length);
    const rank = this.getReferralRank(totalReferrals);

    const stats = {
      totalReferrals,
      totalDescendants,
      activeReferrals: flat.filter((r) => r.isActive).length,
      verifiedReferrals: verifiedCount,
      unverifiedReferrals: unverifiedCount,
      rank
    };

    return {
      user: {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        referralCode: user.referralCode
      },
      stats,
      tree
    };
  }

  /**
   * Get flattened referral list, optionally filtered by verified status.
   * @param {String} userId
   * @param {String} filter - 'all' | 'verified' | 'unverified'
   * @returns {Promise<{ list: Array, stats: object }>}
   */
  async getReferralList(userId, filter = 'all') {
    const { tree, stats } = await this.getReferralTree(userId);
    const flat = this.flattenTree(tree || []);
    let list = flat;
    if (filter === 'verified') {
      list = flat.filter((n) => n.verified);
    } else if (filter === 'unverified') {
      list = flat.filter((n) => !n.verified);
    }
    return { list, stats };
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

    const pendingEarningsAgg = await ReferralCommission.aggregate([
      { $match: { referrer: userId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
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
      pendingEarnings: pendingEarningsAgg[0]?.total || 0
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
