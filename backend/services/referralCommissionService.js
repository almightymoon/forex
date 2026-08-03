const User = require('../models/User');
const BalanceTransaction = require('../models/BalanceTransaction');
const Package = require('../models/Package');

function monthlyFeeMetaStatus(metadata) {
  if (!metadata) return null;
  if (metadata instanceof Map) {
    return metadata.get('monthlyFeeDistributionStatus') || null;
  }
  if (typeof metadata.get === 'function') {
    return metadata.get('monthlyFeeDistributionStatus') || null;
  }
  return metadata.monthlyFeeDistributionStatus || null;
}

function monthlyFeeMetaIsDone(metadata) {
  return monthlyFeeMetaStatus(metadata) === 'done';
}

function monthlyFeeMetaIsSkipped(metadata) {
  return monthlyFeeMetaStatus(metadata) === 'skipped';
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
   * Normalize package name for legacy aliases (FX Launch, FX Scale, FX Legacy).
   * Unknown names are resolved via the Package collection using exact `name` first — see `_findActivePackageByName`.
   * Commission is always calculated from the REFERRAL POOL, never from package amount.
   */
  normalizePackageName(name) {
    if (!name || typeof name !== 'string') return 'Unknown';
    const n = name.trim().toLowerCase();
    if (n.includes('launch')) return 'FX Launch';
    if (n.includes('scale')) return 'FX Scale';
    if (n.includes('legacy')) return 'FX Legacy';
    if (n.includes('starter')) return 'FX Starter';
    return 'Unknown';
  }

  /**
   * Resolve an active Package document: exact name match first, then legacy normalized aliases.
   */
  async _findActivePackageByName(packageNameRaw) {
    const trimmed = typeof packageNameRaw === 'string' ? packageNameRaw.trim() : '';
    if (!trimmed) return null;

    let pkg = await Package.findOne({ name: trimmed, isActive: true }).lean();
    if (pkg) return pkg;

    const alias = this.normalizePackageName(trimmed);
    if (alias !== 'Unknown') {
      pkg = await Package.findOne({ name: alias, isActive: true }).lean();
    }
    return pkg || null;
  }

  /**
   * Get referral pool amount for a package.
   * @param {String} packageName - Package name (raw or normalized)
   * @param {Number} packageAmount - Full package amount
   * @returns {Number} Amount allocated to referral pool
   */
  async getReferralPool(packageName, packageAmount) {
    const cfg = await this.getCommissionConfig(packageName);
    if (cfg.packageCommissionEnabled === false) return 0;
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
    if (cfg.packageCommissionEnabled === false) return Math.round(packageAmount * 100) / 100;
    const poolPercentage = Number(cfg.referralPoolPercentage) || 0;
    return Math.round((packageAmount * (1 - poolPercentage)) * 100) / 100;
  }

  async getCommissionConfig(packageNameRaw) {
    const trimmed = typeof packageNameRaw === 'string' ? packageNameRaw.trim() : '';
    if (!trimmed) {
      return {
        packageName: 'Unknown',
        packageCommissionEnabled: false,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }

    try {
      const pkg = await this._findActivePackageByName(trimmed);
      if (!pkg) {
        const fallbackKey = this.normalizePackageName(trimmed);
        return {
          packageName: fallbackKey === 'Unknown' ? trimmed : fallbackKey,
          packageCommissionEnabled: false,
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
        packageCommissionEnabled: pkg.packageCommissionEnabled !== false,
        referralPoolPercentage:
          typeof pkg.referralPoolPercentage === 'number'
            ? pkg.referralPoolPercentage
            : 0,
        commissionRates
      };
    } catch (e) {
      return {
        packageName: trimmed,
        packageCommissionEnabled: false,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates }
      };
    }
  }

  /**
   * Normalize a rates object (plain / lean / Mongoose subdoc) into {1..5} fractions.
   * Returns null when no level has a numeric rate (so callers can fall back).
   */
  _normalizeCommissionRates(ratesIn) {
    if (!ratesIn || typeof ratesIn !== 'object') return null;
    const src =
      typeof ratesIn.toObject === 'function' ? ratesIn.toObject() : ratesIn;
    const out = {};
    let any = false;
    for (let level = 1; level <= 5; level++) {
      const raw = src[level] ?? src[String(level)];
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (typeof n === 'number' && Number.isFinite(n)) {
        out[level] = n;
        any = true;
      }
    }
    return any ? out : null;
  }

  /**
   * Fill missing levels from fallback (defaults), keeping package-provided levels as-is.
   */
  _fillCommissionRates(partial, fallback) {
    const base = fallback && typeof fallback === 'object' ? fallback : this.commissionRates;
    return {
      1: typeof partial?.[1] === 'number' ? partial[1] : base[1],
      2: typeof partial?.[2] === 'number' ? partial[2] : base[2],
      3: typeof partial?.[3] === 'number' ? partial[3] : base[3],
      4: typeof partial?.[4] === 'number' ? partial[4] : base[4],
      5: typeof partial?.[5] === 'number' ? partial[5] : base[5]
    };
  }

  /**
   * Monthly-fee distribution config (per package tier).
   * Prefer that package's monthlyFeeReferralPoolPercentage + monthlyFeeCommissionRates
   * (what admins set under "Monthly fee distribution settings"). Fall back to the
   * package's main referral pool/rates only when monthly overrides are unset.
   */
  async getMonthlyFeeCommissionConfig(packageNameRaw) {
    const trimmed = typeof packageNameRaw === 'string' ? packageNameRaw.trim() : '';
    if (!trimmed) {
      return {
        packageName: 'Unknown',
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates },
        ratesSource: 'defaults'
      };
    }

    try {
      const pkg = await this._findActivePackageByName(trimmed);
      if (!pkg) {
        const fallbackKey = this.normalizePackageName(trimmed);
        return {
          packageName: fallbackKey === 'Unknown' ? trimmed : fallbackKey,
          referralPoolPercentage: 0,
          commissionRates: { ...this.commissionRates },
          ratesSource: 'defaults'
        };
      }

      const monthlyRates = this._normalizeCommissionRates(pkg.monthlyFeeCommissionRates);
      const mainRates = this._normalizeCommissionRates(pkg.commissionRates);
      const ratesSource = monthlyRates
        ? 'monthlyFeeCommissionRates'
        : mainRates
          ? 'commissionRates'
          : 'defaults';
      const commissionRates = this._fillCommissionRates(
        monthlyRates || mainRates,
        this.commissionRates
      );

      const monthlyPool =
        typeof pkg.monthlyFeeReferralPoolPercentage === 'number'
          ? pkg.monthlyFeeReferralPoolPercentage
          : null;
      const pool =
        monthlyPool != null
          ? monthlyPool
          : typeof pkg.referralPoolPercentage === 'number'
            ? pkg.referralPoolPercentage
            : 0;

      return {
        packageName: pkg.name,
        referralPoolPercentage: typeof pool === 'number' && !Number.isNaN(pool) ? pool : 0,
        commissionRates,
        ratesSource,
        poolSource:
          monthlyPool != null ? 'monthlyFeeReferralPoolPercentage' : 'referralPoolPercentage'
      };
    } catch (e) {
      return {
        packageName: trimmed,
        referralPoolPercentage: 0,
        commissionRates: { ...this.commissionRates },
        ratesSource: 'defaults'
      };
    }
  }

  _paymentMetadataGet(payment, key) {
    const m = payment?.metadata;
    if (!m) return undefined;
    if (m instanceof Map) return m.get(key);
    if (typeof m.get === 'function') return m.get(key);
    if (typeof m === 'object' && m !== null && Object.prototype.hasOwnProperty.call(m, key)) {
      return m[key];
    }
    return undefined;
  }

  /**
   * Same revenue base as {@link distributeCommissions} (admin-granted uses metadata commission base).
   */
  getPackageAmountForCommission(payment) {
    const adminGranted = this._paymentMetadataGet(payment, 'adminGranted') === '1';
    const commissionBaseRaw = adminGranted ? this._paymentMetadataGet(payment, 'commissionBaseAmount') : null;
    const commissionBase = commissionBaseRaw != null ? Number(commissionBaseRaw) : null;
    return (
      Number(
        adminGranted && Number.isFinite(commissionBase) && commissionBase > 0
          ? commissionBase
          : (payment.finalAmount ?? payment.amount)
      ) || 0
    );
  }

  /**
   * Completed package payments with no referral_commission rows yet (candidates for backfill).
   * @param {{ limit?: number, paymentIds?: string[] }} opts
   */
  async _findCompletedPackagePaymentsWithNoReferralCommissions(opts = {}) {
    const mongoose = require('mongoose');
    const Payment = require('../models/Payment');
    const btColl = BalanceTransaction.collection.name;

    const limit = Math.min(Math.max(parseInt(String(opts.limit || '200'), 10) || 200, 1), 500);
    const match = { type: 'package', status: 'completed' };
    if (opts.paymentIds && opts.paymentIds.length) {
      const ids = opts.paymentIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (!ids.length) return [];
      match._id = { $in: ids };
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      ...(opts.paymentIds && opts.paymentIds.length ? [] : [{ $limit: limit }]),
      {
        $lookup: {
          from: btColl,
          let: { pid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$relatedPayment', '$$pid'] }, { $eq: ['$type', 'referral_commission'] }]
                }
              }
            },
            { $group: { _id: null, net: { $sum: '$amount' } } }
          ],
          as: '_rcnet'
        }
      },
      {
        $match: {
          $or: [{ _rcnet: { $size: 0 } }, { '_rcnet.0.net': { $lte: 0.02 } }]
        }
      },
      { $project: { _rcnet: 0 } }
    ];

    return Payment.aggregate(pipeline);
  }

  /**
   * Net sum of referral_commission rows for a package payment (originals + rollbacks).
   * Used to detect whether a payment still has uncancelled commission liability.
   */
  async getNetReferralCommissionAmount(paymentId) {
    const BalanceTransaction = require('../models/BalanceTransaction');
    const mongoose = require('mongoose');
    const pid = mongoose.Types.ObjectId.isValid(paymentId)
      ? new mongoose.Types.ObjectId(String(paymentId))
      : paymentId;
    const agg = await BalanceTransaction.aggregate([
      { $match: { relatedPayment: pid, type: 'referral_commission' } },
      { $group: { _id: null, net: { $sum: '$amount' } } }
    ]);
    const n = agg[0]?.net;
    return typeof n === 'number' && !Number.isNaN(n) ? Math.round(n * 100) / 100 : 0;
  }

  /**
   * Build commission config from admin "proposed" body (preview before save).
   */
  commissionConfigFromProposal(packageDisplayName, proposed) {
    if (!proposed || typeof proposed !== 'object') return null;
    const ratesIn = proposed.commissionRates && typeof proposed.commissionRates === 'object' ? proposed.commissionRates : {};
    const commissionRates = {
      1: typeof ratesIn[1] === 'number' ? ratesIn[1] : this.commissionRates[1],
      2: typeof ratesIn[2] === 'number' ? ratesIn[2] : this.commissionRates[2],
      3: typeof ratesIn[3] === 'number' ? ratesIn[3] : this.commissionRates[3],
      4: typeof ratesIn[4] === 'number' ? ratesIn[4] : this.commissionRates[4],
      5: typeof ratesIn[5] === 'number' ? ratesIn[5] : this.commissionRates[5]
    };
    const pool =
      typeof proposed.referralPoolPercentage === 'number' && !Number.isNaN(proposed.referralPoolPercentage)
        ? proposed.referralPoolPercentage
        : 0;
    return {
      packageName: packageDisplayName || 'Package',
      packageCommissionEnabled: proposed.packageCommissionEnabled !== false,
      referralPoolPercentage: pool,
      commissionRates
    };
  }

  /**
   * Simulate pool + upline payouts for a completed package payment (no DB writes).
   * @param {object} payment — lean doc with populated user (parentReferralCode, referredByDefaultCode, …)
   * @param {object} cfg — same shape as getCommissionConfig()
   */
  async _simulatePackageCommissionDistribution(payment, cfg) {
    const packageNameRaw = payment.package?.name || '';
    const packageAmount = this.getPackageAmountForCommission(payment);
    const buyer = payment.user;

    if (packageAmount <= 0) {
      return { ok: false, reason: 'invalid_or_zero_amount', packageNameRaw };
    }
    if (cfg.packageCommissionEnabled === false) {
      return { ok: false, reason: 'commission_disabled_or_zero_pool', packageNameRaw };
    }
    const poolPct = Number(cfg.referralPoolPercentage) || 0;
    if (poolPct <= 0) {
      return { ok: false, reason: 'commission_disabled_or_zero_pool', packageNameRaw };
    }

    if (!buyer || !buyer._id) {
      return { ok: false, reason: 'buyer_not_found', packageNameRaw };
    }
    if (!buyer.parentReferralCode) {
      return { ok: false, reason: 'no_referrer', packageNameRaw, buyerEmail: buyer.email };
    }
    if (buyer.referredByDefaultCode === true) {
      return { ok: false, reason: 'default_referral_only', packageNameRaw, buyerEmail: buyer.email };
    }

    const referralPool = Math.round(packageAmount * poolPct * 100) / 100;
    const companyShare = Math.round(packageAmount * (1 - poolPct) * 100) / 100;
    const packageName = cfg.packageName || this.normalizePackageName(packageNameRaw);

    const levels = [];
    let currentReferralCode = buyer.parentReferralCode;
    let level = 1;
    while (currentReferralCode && level <= 5) {
      const referrer = await User.findOne({ referralCode: currentReferralCode })
        .select('firstName lastName email referralCode parentReferralCode')
        .lean();
      if (!referrer) break;
      const commissionRate = cfg.commissionRates?.[level] ?? this.commissionRates[level] ?? 0;
      const amount = Math.round(referralPool * commissionRate * 100) / 100;
      levels.push({
        level,
        rateOfPool: commissionRate,
        rateOfPoolDisplay: `${(Math.round(commissionRate * 10000) / 100).toFixed(2)}%`,
        amount,
        payTo: {
          userId: String(referrer._id),
          email: referrer.email,
          name: `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim()
        }
      });
      currentReferralCode = referrer.parentReferralCode;
      level++;
    }

    const totalCommissions = Math.round(levels.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    if (totalCommissions <= 0) {
      return {
        ok: false,
        reason: 'zero_payout_chain',
        packageNameRaw,
        buyerEmail: buyer.email
      };
    }

    return {
      ok: true,
      packageNameRaw,
      resolvedPackageName: packageName,
      buyer: {
        email: buyer.email,
        name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim()
      },
      packageAmount,
      referralPoolPercentage: poolPct,
      referralPool,
      platformShare: companyShare,
      levels,
      totalCommissionsToCredit: totalCommissions
    };
  }

  /**
   * Positive referral_commission rows for this payment that are not yet paired with a rollback row.
   */
  async getOpenPositiveReferralCommissionTransactions(paymentId) {
    const BalanceTransaction = require('../models/BalanceTransaction');
    const mongoose = require('mongoose');
    const pid = mongoose.Types.ObjectId.isValid(paymentId)
      ? new mongoose.Types.ObjectId(String(paymentId))
      : paymentId;

    const positives = await BalanceTransaction.find({
      relatedPayment: pid,
      type: 'referral_commission',
      amount: { $gt: 0 }
    })
      .sort({ createdAt: 1 })
      .lean();

    const open = [];
    for (const tx of positives) {
      const existingRollback = await BalanceTransaction.findOne({
        type: 'referral_commission',
        relatedPayment: pid,
        'metadata.rollbackOfTransactionId': String(tx._id)
      })
        .select('_id')
        .lean();
      if (existingRollback?._id) continue;
      const md = tx.metadata;
      const level =
        md instanceof Map
          ? md.get('level')
          : typeof md?.get === 'function'
            ? md.get('level')
            : md?.level;
      open.push({
        transactionId: String(tx._id),
        userId: String(tx.user),
        level: level != null ? String(level) : '?',
        amount: Number(tx.amount) || 0,
        createdAt: tx.createdAt
      });
    }
    return open;
  }

  /**
   * Post negative referral_commission rows to reverse open positive commissions for a package payment.
   */
  async rollbackOpenReferralCommissionsForPayment(paymentId, { performedBy } = {}) {
    const BalanceTransaction = require('../models/BalanceTransaction');
    const User = require('../models/User');
    const mongoose = require('mongoose');
    const pid = mongoose.Types.ObjectId.isValid(paymentId)
      ? new mongoose.Types.ObjectId(String(paymentId))
      : paymentId;

    const txs = await BalanceTransaction.find({
      relatedPayment: pid,
      type: 'referral_commission',
      amount: { $gt: 0 }
    })
      .sort({ createdAt: 1 })
      .lean();

    let reversedCount = 0;
    let reversedAmount = 0;
    const details = [];

    for (const tx of txs) {
      const existingRollback = await BalanceTransaction.findOne({
        type: 'referral_commission',
        relatedPayment: pid,
        'metadata.rollbackOfTransactionId': String(tx._id)
      })
        .select('_id')
        .lean();
      if (existingRollback?._id) continue;

      const amt = Number(tx.amount || 0);
      await BalanceTransaction.createTransaction({
        user: tx.user,
        type: 'referral_commission',
        amount: -amt,
        description: 'Commission rollback (admin redistribute package)',
        relatedPayment: pid,
        notes: `Reversing referral commission of $${amt.toFixed(2)} to apply updated package commission settings`,
        performedBy: performedBy || undefined,
        metadata: new Map([
          ['rollbackOfTransactionId', String(tx._id)],
          ['rollbackSource', 'admin_redistribute_package']
        ])
      });

      try {
        const refUser = await User.findById(tx.user);
        if (refUser?.referralStats) {
          const cur = Number(refUser.referralStats.totalEarnings || 0);
          refUser.referralStats.totalEarnings = Math.max(0, cur - amt);
          const vr = Number(refUser.referralStats.verifiedReferrals || 0);
          refUser.referralStats.verifiedReferrals = Math.max(0, vr - 1);
          await refUser.save();
        }
      } catch (e) {
        // ignore
      }

      reversedCount += 1;
      reversedAmount += amt;
      details.push({ transactionId: String(tx._id), userId: String(tx.user), amount: amt });
    }

    return { reversedCount, reversedAmount: Math.round(reversedAmount * 100) / 100, details };
  }

  /**
   * Roll back any open referral commissions for this payment, then pay again using current Package rules.
   */
  async redistributePackagePurchaseCommissions(paymentId, { performedBy } = {}) {
    const Payment = require('../models/Payment');
    const rb = await this.rollbackOpenReferralCommissionsForPayment(paymentId, { performedBy });
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error('payment_not_found');
    }
    const created = await this.distributeCommissions(payment);
    return {
      rollback: rb,
      commissionsCreated: created.length,
      commissions: created
    };
  }

  /**
   * Preview rollback + new payouts for completed package payments whose stored package.name matches.
   * @param {{ packageName: string, limit?: number, proposed?: object }} opts — proposed = unsaved form (optional)
   */
  async previewRedistributePackageCommissions(opts) {
    const Payment = require('../models/Payment');
    const packageName = typeof opts.packageName === 'string' ? opts.packageName.trim() : '';
    const limit = Math.min(Math.max(parseInt(String(opts.limit || '100'), 10) || 100, 1), 500);
    if (!packageName) {
      return { packageName: '', rows: [], error: 'package_name_required' };
    }

    const payments = await Payment.find({
      type: 'package',
      status: 'completed',
      'package.name': packageName
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'firstName lastName email parentReferralCode referredByDefaultCode')
      .lean();

    const rows = [];
    for (const payment of payments) {
      const paymentId = String(payment._id);
      const netPaid = await this.getNetReferralCommissionAmount(payment._id);
      const openOld = await this.getOpenPositiveReferralCommissionTransactions(payment._id);
      const oldTotalOpen = Math.round(openOld.reduce((s, r) => s + r.amount, 0) * 100) / 100;

      let cfg;
      if (opts.proposed && typeof opts.proposed === 'object') {
        cfg = this.commissionConfigFromProposal(packageName, opts.proposed);
      } else {
        cfg = await this.getCommissionConfig(packageName);
      }

      const sim = await this._simulatePackageCommissionDistribution(payment, cfg);

      if (!sim.ok) {
        rows.push({
          paymentId,
          createdAt: payment.createdAt,
          packageNameRaw: payment.package?.name || packageName,
          buyerEmail: payment.user?.email,
          netPaid,
          oldOpenCommissions: openOld,
          oldTotalOpen,
          newTotal: 0,
          deltaReferrerPayout: Math.round((0 - netPaid) * 100) / 100,
          skipReason: sim.reason,
          newLevels: []
        });
        continue;
      }

      const newTotal = sim.totalCommissionsToCredit;
      const deltaReferrerPayout = Math.round((newTotal - netPaid) * 100) / 100;

      rows.push({
        paymentId,
        createdAt: payment.createdAt,
        packageNameRaw: sim.packageNameRaw,
        buyerEmail: payment.user?.email,
        buyerName: sim.buyer?.name,
        netPaid,
        oldOpenCommissions: openOld,
        oldTotalOpen,
        newTotal,
        deltaReferrerPayout,
        newLevels: sim.levels,
        newPool: sim.referralPool,
        newPoolPct: sim.referralPoolPercentage,
        skipReason: null
      });
    }

    return { packageName, scanned: payments.length, rows };
  }

  /**
   * Apply {@link redistributePackagePurchaseCommissions} for each id (sequential).
   */
  async applyRedistributePackageCommissions(paymentIds, { performedBy } = {}) {
    const mongoose = require('mongoose');
    const results = [];
    for (const rawId of paymentIds || []) {
      const idStr = String(rawId).trim();
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        results.push({ paymentId: idStr, ok: false, error: 'invalid_payment_id' });
        continue;
      }
      try {
        const out = await this.redistributePackagePurchaseCommissions(idStr, { performedBy });
        results.push({
          paymentId: idStr,
          ok: true,
          rollback: out.rollback,
          commissionsCreated: out.commissionsCreated
        });
      } catch (e) {
        results.push({ paymentId: idStr, ok: false, error: e.message || 'redistribute_failed' });
      }
    }
    return results;
  }

  /**
   * Preview what {@link distributeCommissions} would pay for payments that currently have no referral commissions.
   */
  async previewBackfillMissingPackageCommissions(opts = {}) {
    const Payment = require('../models/Payment');
    const thinRows = await this._findCompletedPackagePaymentsWithNoReferralCommissions(opts);
    const ids = thinRows.map((r) => r._id);
    if (!ids.length) {
      return {
        scannedWithNoCommissionRows: 0,
        eligible: [],
        skipped: [],
        skippedCounts: {}
      };
    }

    const payments = await Payment.find({ _id: { $in: ids } })
      .populate('user', 'firstName lastName email parentReferralCode referredByDefaultCode')
      .sort({ createdAt: -1 })
      .lean();

    const eligible = [];
    const skipped = [];
    const skippedCounts = {};

    const bumpSkip = (reason) => {
      skippedCounts[reason] = (skippedCounts[reason] || 0) + 1;
    };

    for (const payment of payments) {
      const paymentId = String(payment._id);
      const packageNameRaw = payment.package?.name || '';
      const cfg = await this.getCommissionConfig(packageNameRaw);
      const sim = await this._simulatePackageCommissionDistribution(payment, cfg);

      if (!sim.ok) {
        bumpSkip(sim.reason);
        skipped.push({
          paymentId,
          reason: sim.reason,
          packageNameRaw,
          buyerEmail: sim.buyerEmail
        });
        continue;
      }

      eligible.push({
        paymentId,
        createdAt: payment.createdAt,
        packageNameRaw: sim.packageNameRaw,
        resolvedPackageName: sim.resolvedPackageName,
        buyer: sim.buyer,
        packageAmount: sim.packageAmount,
        referralPoolPercentage: sim.referralPoolPercentage,
        referralPool: sim.referralPool,
        platformShare: sim.platformShare,
        levels: sim.levels,
        totalCommissionsToCredit: sim.totalCommissionsToCredit,
        balanceTransactionsToCreate: sim.levels.filter((l) => l.amount > 0).length
      });
    }

    return {
      scannedWithNoCommissionRows: payments.length,
      eligible,
      skipped,
      skippedCounts
    };
  }

  /**
   * Run {@link distributeCommissions} for each payment id (must be full Mongoose documents — not lean).
   */
  async applyBackfillMissingPackageCommissions(paymentIds) {
    const mongoose = require('mongoose');
    const Payment = require('../models/Payment');
    const results = [];

    for (const rawId of paymentIds) {
      const idStr = String(rawId);
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        results.push({ paymentId: idStr, ok: false, error: 'invalid_payment_id' });
        continue;
      }

      const payment = await Payment.findById(idStr);
      if (!payment) {
        results.push({ paymentId: idStr, ok: false, error: 'payment_not_found' });
        continue;
      }

      const created = await this.distributeCommissions(payment);
      results.push({
        paymentId: idStr,
        ok: true,
        commissionsCreated: created.length,
        detail: created.length ? 'commissions_created' : 'no_commissions_created'
      });
    }

    return results;
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
      
      const netExisting = await this.getNetReferralCommissionAmount(paymentId);
      if (netExisting > 0.02) {
        console.log(
          `[Commission] Net referral commission still $${netExisting.toFixed(2)} for payment ${payment._id}. Skipping duplicate distribution.`
        );
        return [];
      }
      if (netExisting < -0.02) {
        console.warn(
          `[Commission] Negative net referral commission $${netExisting.toFixed(2)} for payment ${payment._id}; skipping distribution.`
        );
        return [];
      }

      const packageAmount = this.getPackageAmountForCommission(payment);
      const packageNameRaw = payment.package?.name || 'Unknown';
      const normalized = this.normalizePackageName(packageNameRaw);
      const cfg = await this.getCommissionConfig(packageNameRaw);
      const packageName = cfg.packageName || normalized;

      if (cfg.packageCommissionEnabled === false) {
        console.log('[Commission] Package commission disabled for:', packageName, '- skipping distribution');
        return [];
      }

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
   * Distribute referral commissions from a completed monthly fee payment.
   * Walks the referral chain up to 5 levels using the payer's package tier monthly-fee pool % and rates.
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

      const openCommissions = await this.getOpenPositiveReferralCommissionTransactions(paymentId);
      if (openCommissions.length > 0) {
        console.log(
          `[MonthlyFeeCommission] Already distributed (${openCommissions.length} open commission txn(s)). Skipping.`
        );
        return [];
      }

      const payMeta = await Payment.findById(paymentId).select('metadata').lean();
      if (monthlyFeeMetaIsSkipped(payMeta?.metadata)) {
        console.log('[MonthlyFeeCommission] Payment marked skipped/removed. Skipping.');
        return [];
      }
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
        `(${(poolPct * 100).toFixed(1)}% from ${cfg.poolSource || 'config'})`,
        '| Platform: $' + companyShare.toFixed(2),
        '| Rates source:',
        cfg.ratesSource || 'config',
        '| L1-L5:',
        [1, 2, 3, 4, 5]
          .map((lvl) => `${((cfg.commissionRates?.[lvl] ?? 0) * 100).toFixed(0)}%`)
          .join('/')
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

      // Traverse referral chain up to 5 levels (same model as package commissions).
      const commissions = [];
      let currentReferralCode = buyer.parentReferralCode;
      let level = 1;
      let totalCommissionsDistributed = 0;

      while (currentReferralCode && level <= 5) {
        console.log(
          `[MonthlyFeeCommission] Processing Level ${level}, looking for code:`,
          currentReferralCode
        );

        const referrer = await User.findOne({ referralCode: currentReferralCode });
        if (!referrer) {
          console.log(`[MonthlyFeeCommission] Level ${level}: Referrer not found, ending chain`);
          break;
        }

        console.log(`[MonthlyFeeCommission] Level ${level}: Found referrer:`, referrer.email);

        const commissionRate = cfg.commissionRates?.[level] ?? 0;
        const commissionAmount = Math.round(referralPool * commissionRate * 100) / 100;

        console.log(
          `[MonthlyFeeCommission] Level ${level}: ${(commissionRate * 100).toFixed(0)}% of $${referralPool.toFixed(2)} pool = $${commissionAmount.toFixed(2)} (${packageName})`
        );

        if (commissionAmount <= 0) {
          currentReferralCode = referrer.parentReferralCode;
          level++;
          continue;
        }

        totalCommissionsDistributed += commissionAmount;

        const transaction = await BalanceTransaction.createTransaction({
          user: referrer._id,
          type: 'referral_commission',
          amount: commissionAmount,
          description: `Level ${level} referral commission from ${buyer.firstName} ${buyer.lastName}'s monthly fee (${packageName})`,
          notes: `Monthly fee payment, Fee: $${feeAmount}, Referral pool: $${referralPool.toFixed(2)}, Platform share: $${companyShare.toFixed(2)}, Rate: ${(commissionRate * 100).toFixed(0)}% of pool (${packageName} settings)`,
          relatedPayment: payment._id,
          metadata: {
            level: level.toString(),
            packageName,
            packageAmount: feeAmount.toString(),
            referralPool: referralPool.toFixed(2),
            companyShare: companyShare.toFixed(2),
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            buyerEmail: buyer.email,
            commissionRate: (commissionRate * 100).toString(),
            commissionFromPool: 'true',
            paymentSource: 'monthly_fee',
            ratesSource: cfg.ratesSource || ''
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
        referrer.referralStats.totalEarnings =
          (referrer.referralStats.totalEarnings || 0) + commissionAmount;
        await referrer.save();

        try {
          const notificationService = require('./notificationService');
          await notificationService.sendNotificationToUser(referrer._id, 'commission', {
            title: `Level ${level} Commission (monthly fee)`,
            message: `You earned $${commissionAmount.toFixed(2)} USDT from ${buyer.firstName} ${buyer.lastName}'s monthly fee (${packageName})`,
            amount: commissionAmount,
            level,
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            packageName,
            referralPool: referralPool.toFixed(2)
          });
        } catch (notifError) {
          console.error(
            `[MonthlyFeeCommission] Level ${level}: notification failed:`,
            notifError.message
          );
        }

        currentReferralCode = referrer.parentReferralCode;
        level++;
      }

      console.log(
        `[MonthlyFeeCommission] Done. Paid $${totalCommissionsDistributed.toFixed(2)} from pool across ${commissions.length} level(s); platform share $${companyShare.toFixed(2)}`
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
    doc.metadata.delete('monthlyFeeSkippedAt');
    doc.markModified('metadata');
    await doc.save();
  }

  async _clearMonthlyFeeDistributionDone(paymentId) {
    const Payment = require('../models/Payment');
    const doc = await Payment.findById(paymentId);
    if (!doc) return;
    if (!doc.metadata) doc.metadata = new Map();
    doc.metadata.delete('monthlyFeeDistributionStatus');
    doc.metadata.delete('monthlyFeeDistributedAt');
    doc.metadata.set('monthlyFeeRolledBackAt', new Date().toISOString());
    doc.markModified('metadata');
    await doc.save();
  }

  async _markMonthlyFeeDistributionSkipped(paymentId, { performedBy } = {}) {
    const Payment = require('../models/Payment');
    const doc = await Payment.findById(paymentId);
    if (!doc) return;
    if (!doc.metadata) doc.metadata = new Map();
    doc.metadata.set('monthlyFeeDistributionStatus', 'skipped');
    doc.metadata.set('monthlyFeeSkippedAt', new Date().toISOString());
    if (performedBy) {
      doc.metadata.set('monthlyFeeSkippedBy', String(performedBy));
    }
    doc.markModified('metadata');
    await doc.save();
  }

  /**
   * Reverse open monthly-fee referral commissions and clear the "done" flag so it can be redistributed.
   */
  async rollbackMonthlyFeeDistribution(paymentId, { performedBy } = {}) {
    const rb = await this.rollbackOpenReferralCommissionsForPayment(paymentId, { performedBy });
    await this._clearMonthlyFeeDistributionDone(paymentId);
    return rb;
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
ReferralCommissionService.monthlyFeeMetaIsSkipped = monthlyFeeMetaIsSkipped;
module.exports = ReferralCommissionService;
