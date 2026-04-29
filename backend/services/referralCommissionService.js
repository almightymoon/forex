const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');
const Package = require('../models/Package');

function monthlyFeeMetaIsDone(metadata) {
  if (!metadata) return false;
  if (metadata instanceof Map) {
    return metadata.get('monthlyFeeDistributionStatus') === 'done';
  }
  if (typeof metadata.get === 'function') {
    return metadata.get('monthlyFeeDistributionStatus') === 'done';
  }
  return metadata.monthlyFeeDistributionStatus === 'done';
}

class ReferralCommissionService {
  constructor() {
    // Commission rates by level (applied to referral pool).
    // These can also be overridden per-package via the Package model.
    this.commissionRates = {
      1: 0.20,  // 20%
      2: 0.15,  // 15%
      3: 0.15,  // 15%
      4: 0.10,  // 10%
      5: 0.10   // 10%
    };
  }
  
  /**
   * Normalize package name to match our config (FX Launch, FX Scale, FX Legacy).
   * Commission is always calculated from the REFERRAL POOL, never from package amount.
   */
  normalizePackageName(name) {
    if (!name || typeof name !== 'string') return 'Unknown';
    const n = name.trim().toLowerCase();
    if (n.includes('launch')) return 'FX Launch';
    if (n.includes('scale')) return 'FX Scale';
    if (n.includes('legacy')) return 'FX Legacy';
    return 'Unknown';
  }

  /**
   * Get referral pool amount for a package.
   * @param {String} packageName - Package name (raw or normalized)
   * @param {Number} packageAmount - Full package amount
   * @returns {Number} Amount allocated to referral pool
   */
  async getReferralPool(packageName, packageAmount) {
    const cfg = await this.getCommissionConfig(packageName);
    const poolPercentage = Number(cfg.referralPoolPercentage) || 0;
    return Math.round((packageAmount * poolPercentage) * 100) / 100;
  }
  
  /**
   * Get company share for a package
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - Full package amount
   * @returns {Number} Amount allocated to company
   */
  async getCompanyShare(packageName, packageAmount) {
    const cfg = await this.getCommissionConfig(packageName);
    const poolPercentage = Number(cfg.referralPoolPercentage) || 0;
    return Math.round((packageAmount * (1 - poolPercentage)) * 100) / 100;
  }

  async getCommissionConfig(packageNameRaw) {
    const key = this.normalizePackageName(packageNameRaw);
    if (key === 'Unknown') {
      return {
        packageName: key,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }

    try {
      const pkg = await Package.findOne({ name: key, isActive: true }).lean();
      if (!pkg) {
        return {
          packageName: key,
          referralPoolPercentage: 0,
          commissionRates: { ...this.commissionRates }
        };
      }

      const rates = pkg.commissionRates || {};
      const commissionRates = {
        1: typeof rates[1] === 'number' ? rates[1] : this.commissionRates[1],
        2: typeof rates[2] === 'number' ? rates[2] : this.commissionRates[2],
        3: typeof rates[3] === 'number' ? rates[3] : this.commissionRates[3],
        4: typeof rates[4] === 'number' ? rates[4] : this.commissionRates[4],
        5: typeof rates[5] === 'number' ? rates[5] : this.commissionRates[5]
      };

      return {
        packageName: pkg.name,
        referralPoolPercentage:
          typeof pkg.referralPoolPercentage === 'number'
            ? pkg.referralPoolPercentage
            : 0,
        commissionRates
      };
    } catch (e) {
      return {
        packageName: key,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }
  }

  /**
   * Monthly-fee distribution config (per package tier).
   * Falls back to the package's main referralPoolPercentage/commissionRates when monthly-fee overrides are not set.
   */
  async getMonthlyFeeCommissionConfig(packageNameRaw) {
    const key = this.normalizePackageName(packageNameRaw);
    if (key === 'Unknown') {
      return {
        packageName: key,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }

    try {
      const pkg = await Package.findOne({ name: key, isActive: true }).lean();
      if (!pkg) {
        return {
          packageName: key,
          referralPoolPercentage: 0,
          commissionRates: { ...this.commissionRates }
        };
      }

      const mainRates = pkg.commissionRates || {};
      const monthlyRatesRaw =
        pkg.monthlyFeeCommissionRates && typeof pkg.monthlyFeeCommissionRates === 'object'
          ? pkg.monthlyFeeCommissionRates
          : null;
      const rates = monthlyRatesRaw || mainRates;

      const commissionRates = {
        1: typeof rates[1] === 'number' ? rates[1] : this.commissionRates[1],
        2: typeof rates[2] === 'number' ? rates[2] : this.commissionRates[2],
        3: typeof rates[3] === 'number' ? rates[3] : this.commissionRates[3],
        4: typeof rates[4] === 'number' ? rates[4] : this.commissionRates[4],
        5: typeof rates[5] === 'number' ? rates[5] : this.commissionRates[5]
      };

      const monthlyPool =
        typeof pkg.monthlyFeeReferralPoolPercentage === 'number'
          ? pkg.monthlyFeeReferralPoolPercentage
          : null;
      const pool = monthlyPool != null ? monthlyPool : (typeof pkg.referralPoolPercentage === 'number' ? pkg.referralPoolPercentage : 0);

      return {
        packageName: pkg.name,
        referralPoolPercentage: typeof pool === 'number' && !Number.isNaN(pool) ? pool : 0,
        commissionRates
      };
    } catch (e) {
      return {
        packageName: key,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }
  }

  /**
   * Distribute commissions for a package purchase up the referral chain
   * @param {Object} payment - The payment object
   * @returns {Promise<Array>} Array of commission transactions
   */
  async distributeCommissions(payment) {
    try {
      console.log('[Commission] Starting distribution for payment:', payment._id);
      
      // Only process package purchases
      if (payment.type !== 'package') {
        console.log('[Commission] Skipping - not a package purchase');
        return [];
      }

      // Only process completed payments
      if (payment.status !== 'completed') {
        console.log('[Commission] Skipping - payment not completed');
        return [];
      }

      // Check if commissions already exist for this payment to prevent duplicates
      const BalanceTransaction = require('../models/BalanceTransaction');
      const mongoose = require('mongoose');
      // Ensure payment._id is converted to ObjectId if it's a string
      const paymentId = mongoose.Types.ObjectId.isValid(payment._id) 
        ? (typeof payment._id === 'string' ? new mongoose.Types.ObjectId(payment._id) : payment._id)
        : payment._id;
      
      const existingCommissions = await BalanceTransaction.countDocuments({
        relatedPayment: paymentId,
        type: 'referral_commission'
      });
      
      if (existingCommissions > 0) {
        console.log(`[Commission] Commissions already exist for payment ${payment._id} (${existingCommissions} found). Skipping to prevent duplicates.`);
        return [];
      }

      const adminGranted = !!(payment?.metadata && typeof payment.metadata.get === 'function' && payment.metadata.get('adminGranted') === '1');
      const commissionBaseRaw =
        adminGranted && payment?.metadata && typeof payment.metadata.get === 'function'
          ? payment.metadata.get('commissionBaseAmount')
          : null;
      const commissionBase = commissionBaseRaw != null ? Number(commissionBaseRaw) : null;

      // Normal purchases: use finalAmount (after discounts) as base.
      // Admin-granted packages: keep revenue at $0, but still distribute commissions from the package price
      // using metadata.commissionBaseAmount.
      const packageAmount = Number(
        adminGranted && Number.isFinite(commissionBase) && commissionBase > 0
          ? commissionBase
          : (payment.finalAmount ?? payment.amount)
      ) || 0;
      const packageNameRaw = payment.package?.name || 'Unknown';
      const normalized = this.normalizePackageName(packageNameRaw);
      const cfg = await this.getCommissionConfig(packageNameRaw);
      const packageName = cfg.packageName || normalized;
      const poolPct = cfg.referralPoolPercentage || 0;

      // Commission is ALWAYS from referral pool, never from package amount.
      // e.g. FX Legacy $1000 -> pool 25% = $250; Level 5 = 10% of $250 = $25 (not $100).
      const referralPool = Math.round((packageAmount * poolPct) * 100) / 100;
      const companyShare = Math.round((packageAmount * (1 - poolPct)) * 100) / 100;

      // Double-check: pool must match configured percentage (100% pool allowed for FX Launch).
      if (packageName !== 'Unknown' && poolPct > 0) {
        if (Math.abs(referralPool - packageAmount * poolPct) > 0.02) {
          throw new Error(`[Commission] BUG: Pool $${referralPool} inconsistent with ${(poolPct * 100)}% of $${packageAmount}.`);
        }
      }
      
      console.log('[Commission] Package:', packageNameRaw, '->', packageName, '| Amount: $' + packageAmount);
      console.log('[Commission] Referral Pool: $' + referralPool.toFixed(2), `(${(poolPct * 100).toFixed(0)}% of package)`);
      console.log('[Commission] Company Share: $' + companyShare.toFixed(2));

      // Get the buyer
      const buyer = await User.findById(payment.user);
      if (!buyer) {
        console.log('[Commission] Buyer not found');
        return [];
      }

      console.log('[Commission] Buyer:', buyer.email, 'Parent code:', buyer.parentReferralCode);

      // If buyer has no referrer, no commissions to distribute
      if (!buyer.parentReferralCode) {
        console.log('[Commission] No referrer - ending distribution. Company keeps full share: $' + packageAmount.toFixed(2));
        return [];
      }

      // Buyer came from default referral link only (no ref param) — do not pay commission
      if (buyer.referredByDefaultCode === true) {
        console.log('[Commission] Buyer referred via default link only — skipping commission distribution. Company keeps full share: $' + packageAmount.toFixed(2));
        return [];
      }

      const commissions = [];
      let currentReferralCode = buyer.parentReferralCode;
      let level = 1;
      let totalCommissionsDistributed = 0;

      // Traverse up the referral chain (max 5 levels)
      while (currentReferralCode && level <= 5) {
        console.log(`[Commission] Processing Level ${level}, looking for code:`, currentReferralCode);
        
        // Find the referrer
        const referrer = await User.findOne({ referralCode: currentReferralCode });
        
        if (!referrer) {
          console.log(`[Commission] Level ${level}: Referrer not found, ending chain`);
          break;
        }

        console.log(`[Commission] Level ${level}: Found referrer:`, referrer.email);

        // Commission = rate × REFERRAL POOL only. Never use package amount.
        const commissionRate = cfg.commissionRates?.[level] ?? this.commissionRates[level] ?? 0;
        const commissionAmount = Math.round((referralPool * commissionRate) * 100) / 100;
        totalCommissionsDistributed += commissionAmount;

        // Assert we never used package amount (e.g. 10% of $1000 = $100 would be wrong for L5).
        const wrongIfFromPackage = Math.round((packageAmount * commissionRate) * 100) / 100;
        if (Math.abs(commissionAmount - wrongIfFromPackage) < 0.01 && referralPool < packageAmount - 0.01) {
          throw new Error(`[Commission] BUG: Level ${level} commission $${commissionAmount} equals ${(commissionRate * 100)}% of package ($${packageAmount}). Must use pool $${referralPool} only.`);
        }

        console.log(`[Commission] Level ${level}: ${(commissionRate * 100).toFixed(0)}% of $${referralPool.toFixed(2)} pool = $${commissionAmount.toFixed(2)} (NOT ${(commissionRate * 100)}% of $${packageAmount})`);

        // Create balance transaction for commission
        const transaction = await BalanceTransaction.createTransaction({
          user: referrer._id,
          type: 'referral_commission',
          amount: commissionAmount,
          description: `Level ${level} referral commission from ${buyer.firstName} ${buyer.lastName}'s ${packageName} purchase`,
          notes: `Package: ${packageName}, Package Amount: $${packageAmount}, Referral Pool: $${referralPool.toFixed(2)}, Commission Rate: ${(commissionRate * 100).toFixed(0)}% of pool`,
          relatedPayment: payment._id,
          metadata: {
            level: level.toString(),
            packageName: packageName,
            packageAmount: packageAmount.toString(),
            referralPool: referralPool.toFixed(2),
            companyShare: companyShare.toFixed(2),
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            buyerEmail: buyer.email,
            commissionRate: (commissionRate * 100).toString(),
            commissionFromPool: 'true'
          }
        });

        commissions.push({
          level,
          referrer: {
            _id: referrer._id,
            email: referrer.email,
            name: `${referrer.firstName} ${referrer.lastName}`
          },
          amount: commissionAmount,
          transactionId: transaction._id
        });

        console.log(`[Commission] Level ${level}: Transaction created, new balance: $${transaction.balanceAfter.toFixed(2)}`);

        // Update referrer stats: verified count and total earnings
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
        referrer.referralStats.verifiedReferrals += 1;
        referrer.referralStats.totalEarnings = (referrer.referralStats.totalEarnings || 0) + commissionAmount;
        await referrer.save();

        // Send notification to referrer
        try {
          const notificationService = require('./notificationService');
          await notificationService.sendNotificationToUser(referrer._id, 'commission', {
            title: `Level ${level} Commission Earned!`,
            message: `You earned $${commissionAmount.toFixed(2)} USDT commission from ${buyer.firstName} ${buyer.lastName}'s ${packageName} purchase`,
            amount: commissionAmount,
            level: level,
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            packageName: packageName,
            referralPool: referralPool.toFixed(2)
          });
        } catch (notifError) {
          console.error(`[Commission] Level ${level}: Failed to send notification:`, notifError.message);
        }

        // Move up to the next level
        currentReferralCode = referrer.parentReferralCode;
        level++;
      }

      console.log(`[Commission] Distribution complete.`);
      console.log(`[Commission] Total commissions distributed: $${totalCommissionsDistributed.toFixed(2)}`);
      console.log(`[Commission] Company share: $${companyShare.toFixed(2)}`);
      console.log(`[Commission] Total: $${(totalCommissionsDistributed + companyShare).toFixed(2)} (should equal $${packageAmount.toFixed(2)})`);
      
      return commissions;

    } catch (error) {
      console.error('[Commission] Error distributing commissions:', error);
      throw error;
    }
  }

  /**
   * Distribute referral commissions from a completed monthly fee payment (admin-triggered).
   * Uses the same referral pool % and per-level rates as the payer's active package tier.
   * @param {Object} payment - Payment doc (monthly_fee, completed)
   * @returns {Promise<Array>} Commission result objects (same shape as distributeCommissions)
   */
  async distributeMonthlyFeeCommissions(payment) {
    const Payment = require('../models/Payment');
    const BalanceTransaction = require('../models/BalanceTransaction');
    const mongoose = require('mongoose');
    const { resolvePackageFromPayment } = require('../utils/monthlyFeeStatus');

    try {
      console.log('[MonthlyFeeCommission] Starting distribution for payment:', payment._id);

      if (payment.type !== 'monthly_fee') {
        console.log('[MonthlyFeeCommission] Skipping - not a monthly fee payment');
        return [];
      }
      if (payment.status !== 'completed') {
        console.log('[MonthlyFeeCommission] Skipping - payment not completed');
        return [];
      }

      const paymentId = mongoose.Types.ObjectId.isValid(payment._id)
        ? typeof payment._id === 'string'
          ? new mongoose.Types.ObjectId(payment._id)
          : payment._id
        : payment._id;

      const existingCommissions = await BalanceTransaction.countDocuments({
        relatedPayment: paymentId,
        type: 'referral_commission'
      });
      if (existingCommissions > 0) {
        console.log(
          `[MonthlyFeeCommission] Already distributed (${existingCommissions} commission txns). Skipping.`
        );
        return [];
      }

      const payMeta = await Payment.findById(paymentId).select('metadata').lean();
      if (monthlyFeeMetaIsDone(payMeta?.metadata)) {
        console.log('[MonthlyFeeCommission] Already marked done (no commission rows). Skipping.');
        return [];
      }

      const feeAmount = Number(payment.finalAmount ?? payment.amount) || 0;
      if (feeAmount <= 0) {
        throw new Error('Monthly fee payment has no positive amount');
      }

      const buyer = await User.findById(payment.user);
      if (!buyer) {
        throw new Error('Payer user not found');
      }

      const completedPackagePayment = await Payment.findOne({
        user: payment.user,
        status: 'completed',
        type: 'package'
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!completedPackagePayment) {
        throw new Error(
          'Cannot resolve package tier: user has no completed package purchase. Pool percentages come from the package.'
        );
      }

      const pkgDoc = await resolvePackageFromPayment(completedPackagePayment);
      const packageNameRaw =
        (payment.metadata &&
          (typeof payment.metadata.get === 'function'
            ? payment.metadata.get('packageName')
            : payment.metadata.packageName)) ||
        completedPackagePayment.package?.name ||
        pkgDoc?.name ||
        'Unknown';

      const cfg = await this.getMonthlyFeeCommissionConfig(packageNameRaw);
      const packageName = cfg.packageName || this.normalizePackageName(packageNameRaw);
      const poolPct = cfg.referralPoolPercentage || 0;

      const referralPool = Math.round(feeAmount * poolPct * 100) / 100;
      const companyShare = Math.round(feeAmount * (1 - poolPct) * 100) / 100;

      console.log(
        '[MonthlyFeeCommission] Tier:',
        packageName,
        '| Fee: $' + feeAmount,
        '| Pool: $' + referralPool.toFixed(2),
        '| Platform: $' + companyShare.toFixed(2)
      );

      if (!buyer.parentReferralCode) {
        console.log('[MonthlyFeeCommission] No referrer — nothing to pay from pool');
        await this._markMonthlyFeeDistributionDone(payment._id);
        return [];
      }
      if (buyer.referredByDefaultCode === true) {
        console.log('[MonthlyFeeCommission] Default referral only — skipping chain');
        await this._markMonthlyFeeDistributionDone(payment._id);
        return [];
      }

      // Monthly fee commissions pay DIRECT referrer only (Level 1).
      const commissions = [];
      const level = 1;
      let totalCommissionsDistributed = 0;

      const referrer = await User.findOne({ referralCode: buyer.parentReferralCode });
      if (!referrer) {
        console.log('[MonthlyFeeCommission] Level 1: Referrer not found, ending');
        await this._markMonthlyFeeDistributionDone(payment._id);
        return [];
      }

      const commissionRate = cfg.commissionRates?.[level] ?? this.commissionRates[level] ?? 0;
      const commissionAmount = Math.round(referralPool * commissionRate * 100) / 100;
      totalCommissionsDistributed += commissionAmount;

      const transaction = await BalanceTransaction.createTransaction({
        user: referrer._id,
        type: 'referral_commission',
        amount: commissionAmount,
        description: `Level 1 referral commission from ${buyer.firstName} ${buyer.lastName}'s monthly fee (${packageName})`,
        notes: `Monthly fee payment, Fee: $${feeAmount}, Referral pool: $${referralPool.toFixed(2)}, Platform share: $${companyShare.toFixed(2)}, Rate: ${(commissionRate * 100).toFixed(0)}% of pool`,
        relatedPayment: payment._id,
        metadata: {
          level: '1',
          packageName,
          packageAmount: feeAmount.toString(),
          referralPool: referralPool.toFixed(2),
          companyShare: companyShare.toFixed(2),
          buyerName: `${buyer.firstName} ${buyer.lastName}`,
          buyerEmail: buyer.email,
          commissionRate: (commissionRate * 100).toString(),
          commissionFromPool: 'true',
          paymentSource: 'monthly_fee'
        }
      });

      commissions.push({
        level: 1,
        referrer: {
          _id: referrer._id,
          email: referrer.email,
          name: `${referrer.firstName} ${referrer.lastName}`
        },
        amount: commissionAmount,
        transactionId: transaction._id
      });

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
      referrer.referralStats.verifiedReferrals += 1;
      referrer.referralStats.totalEarnings = (referrer.referralStats.totalEarnings || 0) + commissionAmount;
      await referrer.save();

      try {
        const notificationService = require('./notificationService');
        await notificationService.sendNotificationToUser(referrer._id, 'commission', {
          title: 'Level 1 Commission (monthly fee)',
          message: `You earned $${commissionAmount.toFixed(2)} USDT from ${buyer.firstName} ${buyer.lastName}'s monthly fee (${packageName})`,
          amount: commissionAmount,
          level: 1,
          buyerName: `${buyer.firstName} ${buyer.lastName}`,
          packageName,
          referralPool: referralPool.toFixed(2)
        });
      } catch (notifError) {
        console.error('[MonthlyFeeCommission] Level 1: notification failed:', notifError.message);
      }

      console.log(
        `[MonthlyFeeCommission] Done. Paid $${totalCommissionsDistributed.toFixed(2)} from pool; platform share $${companyShare.toFixed(2)}`
      );

      await this._markMonthlyFeeDistributionDone(payment._id);
      return commissions;
    } catch (error) {
      console.error('[MonthlyFeeCommission] Error:', error);
      throw error;
    }
  }

  async _markMonthlyFeeDistributionDone(paymentId) {
    const Payment = require('../models/Payment');
    const doc = await Payment.findById(paymentId);
    if (!doc) return;
    if (!doc.metadata) doc.metadata = new Map();
    doc.metadata.set('monthlyFeeDistributionStatus', 'done');
    doc.metadata.set('monthlyFeeDistributedAt', new Date().toISOString());
    doc.markModified('metadata');
    await doc.save();
  }

  /**
   * Calculate potential commission for a given package
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - The package amount
   * @param {Number} level - The referral level (1-5)
   * @returns {Number} The commission amount
   */
  calculateCommission(packageName, packageAmount, level) {
    // Deprecated: use getCommissionConfig + pool-based calc (async).
    // Kept for backward compatibility; returns 0 to avoid using hardcoded pool defaults.
    const rate = this.commissionRates[level] || 0;
    return Math.round((0 * rate) * 100) / 100;
  }

  /**
   * Get commission breakdown for display
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - The package amount
   * @returns {Object} Commission breakdown with pool info
   */
  getCommissionBreakdown(packageName, packageAmount) {
    // Deprecated: needs DB-backed pool percentage (async).
    // Kept for backward compatibility; returns a safe empty breakdown.
    const key = this.normalizePackageName(packageName);
    return {
      packageName: key,
      packageAmount,
      referralPool: 0,
      referralPoolPercentage: 0,
      companyShare: packageAmount,
      companySharePercentage: 100,
      commissionsByLevel: Object.entries(this.commissionRates).map(([level, rate]) => ({
        level: parseInt(level),
        rate: rate * 100,
        amount: 0
      }))
    };
  }
}

ReferralCommissionService.monthlyFeeMetaIsDone = monthlyFeeMetaIsDone;
module.exports = ReferralCommissionService;
