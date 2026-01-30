const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');

class ReferralCommissionService {
  constructor() {
    // Commission rates by level (applied to referral pool)
    this.commissionRates = {
      1: 0.20,  // 20%
      2: 0.15,  // 15%
      3: 0.15,  // 15%
      4: 0.10,  // 10%
      5: 0.10   // 10%
    };
    
    // Package-specific referral pool percentages
    // Format: { packageName: referralPoolPercentage }
    this.packageReferralPools = {
      'FX Launch': 0.70,   // 70% of $100 = $70 to referrals, 30% to company
      'FX Scale': 0.40,    // 40% of $250 = $100 to referrals, 60% to company
      'FX Legacy': 0.25    // 25% of $1000 = $250 to referrals, 75% to company
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
  getReferralPool(packageName, packageAmount) {
    const key = this.normalizePackageName(packageName);
    const poolPercentage = this.packageReferralPools[key] || 0;
    return Math.round((packageAmount * poolPercentage) * 100) / 100;
  }
  
  /**
   * Get company share for a package
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - Full package amount
   * @returns {Number} Amount allocated to company
   */
  getCompanyShare(packageName, packageAmount) {
    const key = this.normalizePackageName(packageName);
    const poolPercentage = this.packageReferralPools[key] || 0;
    return Math.round((packageAmount * (1 - poolPercentage)) * 100) / 100;
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
      const existingCommissions = await BalanceTransaction.countDocuments({
        relatedPayment: payment._id,
        type: 'referral_commission'
      });
      
      if (existingCommissions > 0) {
        console.log(`[Commission] Commissions already exist for payment ${payment._id} (${existingCommissions} found). Skipping to prevent duplicates.`);
        return [];
      }

      const packageAmount = Number(payment.finalAmount ?? payment.amount) || 0;
      const packageNameRaw = payment.package?.name || 'Unknown';
      const packageName = this.normalizePackageName(packageNameRaw);
      const poolPct = this.packageReferralPools[packageName] || 0;

      // Commission is ALWAYS from referral pool, never from package amount.
      // e.g. FX Legacy $1000 -> pool 25% = $250; Level 5 = 10% of $250 = $25 (not $100).
      const referralPool = this.getReferralPool(packageNameRaw, packageAmount);
      const companyShare = this.getCompanyShare(packageNameRaw, packageAmount);

      // Double-check: we must NEVER use full package amount as pool for known packages.
      if (packageName !== 'Unknown' && poolPct > 0) {
        if (referralPool >= packageAmount - 0.01) {
          throw new Error(`[Commission] BUG: Referral pool ($${referralPool}) must not equal package amount ($${packageAmount}). Commission must be from pool only.`);
        }
        if (Math.abs(referralPool - packageAmount * poolPct) > 0.02) {
          throw new Error(`[Commission] BUG: Pool $${referralPool} inconsistent with ${(poolPct * 100)}% of $${packageAmount}.`);
        }
      }
      
      console.log('[Commission] Package:', packageNameRaw, '->', packageName, '| Amount: $' + packageAmount);
      console.log('[Commission] Referral Pool: $' + referralPool.toFixed(2), `(${(poolPct * 100).toFixed(0)}% of package — NOT using full $${packageAmount})`);
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
        const commissionRate = this.commissionRates[level];
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

        // Increment verified referrals (downline purchaser) for this referrer
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
        await referrer.save();

        // Send notification to referrer
        try {
          const notificationService = require('./notificationService');
          await notificationService.sendNotificationToUser(referrer._id, 'commission', {
            title: `Level ${level} Commission Earned!`,
            message: `You earned $${commissionAmount.toFixed(2)} USDT commission from ${buyer.firstName} ${buyer.lastName}'s ${packageName} purchase (${(commissionRate * 100).toFixed(0)}% of $${referralPool.toFixed(2)} referral pool)`,
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
   * Calculate potential commission for a given package
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - The package amount
   * @param {Number} level - The referral level (1-5)
   * @returns {Number} The commission amount
   */
  calculateCommission(packageName, packageAmount, level) {
    const referralPool = this.getReferralPool(packageName, packageAmount);
    const rate = this.commissionRates[level] || 0;
    return Math.round((referralPool * rate) * 100) / 100;
  }

  /**
   * Get commission breakdown for display
   * @param {String} packageName - Package name
   * @param {Number} packageAmount - The package amount
   * @returns {Object} Commission breakdown with pool info
   */
  getCommissionBreakdown(packageName, packageAmount) {
    const key = this.normalizePackageName(packageName);
    const referralPool = this.getReferralPool(packageName, packageAmount);
    const companyShare = this.getCompanyShare(packageName, packageAmount);
    const poolPercentage = (this.packageReferralPools[key] || 0) * 100;
    
    return {
      packageName: key,
      packageAmount,
      referralPool,
      referralPoolPercentage: poolPercentage,
      companyShare,
      companySharePercentage: (1 - (this.packageReferralPools[key] || 0)) * 100,
      commissionsByLevel: Object.entries(this.commissionRates).map(([level, rate]) => ({
        level: parseInt(level),
        rate: rate * 100,
        amount: Math.round((referralPool * rate) * 100) / 100
      }))
    };
  }
}

module.exports = ReferralCommissionService;
