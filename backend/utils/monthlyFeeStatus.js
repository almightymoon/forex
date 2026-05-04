const Payment = require('../models/Payment');
const Package = require('../models/Package');
const User = require('../models/User');

let _packagesCache = null;
let _packagesCacheAt = 0;
const PACKAGES_CACHE_MS = 60 * 1000;

async function getPackagesCached() {
  const now = Date.now();
  if (!_packagesCache || now - _packagesCacheAt > PACKAGES_CACHE_MS) {
    _packagesCache = await Package.find({}).lean();
    _packagesCacheAt = now;
  }
  return _packagesCache;
}

/** Resolve Package from a payment document (trim / case / price); uses short-lived cache. */
async function resolvePackageFromPayment(payment) {
  const packages = await getPackagesCached();
  return resolvePackageFromList(payment, packages);
}

function startOfUtcMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addUtcMonths(date, months) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + months, 1, 0, 0, 0, 0));
}

/**
 * For a monthly_fee payment recorded at `createdAt` (UTC), the fee period it satisfies is the
 * **previous UTC calendar month** relative to the month that contains `createdAt`
 * (same window as auth: paid in [M_start, M+1_start) covers month M-1).
 */
function feeMonthCoveredForPaymentDate(createdAt) {
  const d = new Date(createdAt);
  const cur = startOfUtcMonth(d);
  const prev = addUtcMonths(cur, -1);
  const feeForMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(prev);
  return { feeForMonthStart: prev.toISOString(), feeForMonthLabel };
}

/**
 * Match Package row to a completed package payment (name trim / case / price fallback).
 */
function resolvePackageFromList(payment, packages) {
  const raw = (payment?.package?.name || '').trim();
  const price = payment?.package?.price;
  if (!raw && (price === undefined || price === null)) return null;

  let p = packages.find((x) => (x.name || '').trim() === raw);
  if (!p && raw) {
    const lower = raw.toLowerCase();
    p = packages.find((x) => (x.name || '').trim().toLowerCase() === lower);
  }
  if (!p && price != null && price !== '') {
    const n = Number(price);
    if (!Number.isNaN(n)) {
      p = packages.find((x) => Number(x.price) === n);
    }
  }
  return p || null;
}

/**
 * Monthly fee + overdue flags aligned with middleware/auth.js requirePackageSubscription.
 */
async function getMonthlyFeeStatusForUser(userId, now = new Date()) {
  const user = await User.findById(userId)
    .select('role firstName lastName email monthlyFeeBillingStartsMonthStart')
    .lean();
  if (!user) {
    return { found: false, error: 'user_not_found' };
  }

  if (user.role === 'admin' || user.role === 'teacher' || user.role === 'instructor') {
    return {
      found: true,
      role: user.role,
      applies: false,
      reason: 'staff_exempt'
    };
  }

  const completedPackagePayment = await Payment.findOne({
    user: userId,
    status: 'completed',
    type: 'package'
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!completedPackagePayment) {
    return {
      found: true,
      applies: false,
      reason: 'no_completed_package',
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
    };
  }

  const adminBlockingPending = await Payment.findOne({
    user: userId,
    type: 'monthly_fee',
    status: 'pending',
    'metadata.accessBlockedUntilPaid': '1'
  })
    .sort({ createdAt: -1 })
    .lean();

  const packages = await getPackagesCached();
  const pkg = resolvePackageFromList(completedPackagePayment, packages);

  const adminImposedPolicy = (pending) => {
    const fromPkg = pkg ? Number(pkg.monthlyFeeAmount ?? 50) : 50;
    const amt = Number(pending.finalAmount ?? pending.amount ?? fromPkg);
    const nameFromPayment = (completedPackagePayment.package?.name || '').trim();
    const currentMonthStart = startOfUtcMonth(now);
    const requiredMonthStart = addUtcMonths(currentMonthStart, -1);
    return {
      found: true,
      applies: true,
      adminImposedAccessBlock: true,
      monthlyFeeEnabled: pkg ? !!pkg.monthlyFeeEnabled : false,
      packageName: pkg?.name || nameFromPayment || null,
      packagePrice: pkg?.price,
      monthlyFeeAmount: amt,
      dueForMonth: requiredMonthStart.toISOString(),
      message:
        'Your administrator has required a monthly fee payment before you can use the rest of the platform.',
      purchasedAt: completedPackagePayment.createdAt,
      isAccessBlocked: true,
      isOverdueForAdminList: false,
      daysOverdue: 0,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
    };
  };

  if (!pkg) {
    if (adminBlockingPending) {
      return adminImposedPolicy(adminBlockingPending);
    }
    const anchorOnly = user.monthlyFeeBillingStartsMonthStart
      ? startOfUtcMonth(new Date(user.monthlyFeeBillingStartsMonthStart))
      : null;
    return {
      found: true,
      applies: true,
      reason: 'package_config_missing',
      packageNameFromPayment: (completedPackagePayment.package?.name || '').trim() || null,
      purchasedAt: completedPackagePayment.createdAt,
      monthlyFeeBillingStartsMonthStart: anchorOnly ? anchorOnly.toISOString() : null,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
    };
  }

  if (adminBlockingPending) {
    return adminImposedPolicy(adminBlockingPending);
  }

  const monthlyFeeEnabled = !!pkg.monthlyFeeEnabled;
  const freeMonths = Number(pkg.monthlyFeeFreeMonths ?? 0);
  const graceDays = Number(pkg.monthlyFeeGraceDays ?? 3);
  const feeAmount = Number(pkg.monthlyFeeAmount ?? 50);

  if (!monthlyFeeEnabled) {
    const anchorOnly = user.monthlyFeeBillingStartsMonthStart
      ? startOfUtcMonth(new Date(user.monthlyFeeBillingStartsMonthStart))
      : null;
    return {
      found: true,
      applies: true,
      monthlyFeeEnabled: false,
      packageName: pkg.name,
      packagePrice: pkg.price,
      message: 'No monthly fee for this package tier.',
      purchasedAt: completedPackagePayment.createdAt,
      monthlyFeeBillingStartsMonthStart: anchorOnly ? anchorOnly.toISOString() : null,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
    };
  }

  const purchasedAt = completedPackagePayment.createdAt
    ? new Date(completedPackagePayment.createdAt)
    : new Date();
  const freeUntil = addUtcMonths(startOfUtcMonth(purchasedAt), freeMonths);
  const currentMonthStart = startOfUtcMonth(now);
  const requiredMonthStart = addUtcMonths(currentMonthStart, -1);
  const requiredMonthEnd = currentMonthStart;

  const billingAnchorStart = user.monthlyFeeBillingStartsMonthStart
    ? startOfUtcMonth(new Date(user.monthlyFeeBillingStartsMonthStart))
    : null;
  const billingAnchorWaived = !!(
    billingAnchorStart &&
    requiredMonthStart.getTime() < billingAnchorStart.getTime()
  );

  const withinFullFreeWindow = now < freeUntil;
  const requiredMonthWaived = requiredMonthStart < freeUntil || billingAnchorWaived;

  const paidFee = await Payment.findOne({
    user: userId,
    status: 'completed',
    type: 'monthly_fee',
    createdAt: { $gte: requiredMonthStart, $lt: requiredMonthEnd }
  })
    .sort({ createdAt: -1 })
    .lean();

  const withinGrace = now.getUTCDate() <= graceDays;

  const wouldBlockApi =
    !withinFullFreeWindow &&
    !requiredMonthWaived &&
    !withinGrace &&
    !paidFee;

  const wouldShowOverdueList =
    now.getUTCDate() > graceDays &&
    !withinFullFreeWindow &&
    !requiredMonthWaived &&
    !paidFee;

  const daysOverdue = Math.max(0, now.getUTCDate() - graceDays);

  return {
    found: true,
    applies: true,
    monthlyFeeEnabled: true,
    packageName: pkg.name,
    packagePrice: pkg.price,
    monthlyFeeAmount: feeAmount,
    graceDays,
    freeMonths,
    purchasedAt: purchasedAt.toISOString(),
    freeUntil: freeUntil.toISOString(),
    dueForMonth: requiredMonthStart.toISOString(),
    monthlyFeeBillingStartsMonthStart: billingAnchorStart
      ? billingAnchorStart.toISOString()
      : null,
    billingAnchorWaived,
    withinFullFreeWindow,
    requiredMonthWaived,
    withinGracePeriod: withinGrace,
    paidForCurrentCycle: !!paidFee,
    lastPaidFeeAt: paidFee?.createdAt || null,
    isAccessBlocked: wouldBlockApi,
    isOverdueForAdminList: wouldShowOverdueList,
    daysOverdue: wouldShowOverdueList ? daysOverdue : 0,
    user: { firstName: user.firstName, lastName: user.lastName, email: user.email }
  };
}

/**
 * Students who still owe the monthly fee for the current billing cycle (not yet completed),
 * including: in grace, overdue (past grace), or submitted payment pending admin confirmation.
 *
 * @param {object} opts
 * @param {Date} [opts.now] — defaults to now (use `referenceDate` from query for "as of" views)
 * @param {string} [opts.status] — 'all' | 'in_grace' | 'overdue' | 'pending_confirmation'
 * @param {string} [opts.packageName] — trim, case-insensitive partial match on package display name
 * @param {boolean} [opts.includeNoFeeTiers=true] — list lifetime / no-monthly-fee packages too (feeStatus: no_fee_required)
 */
async function listPendingMonthlyFeeStudents(opts = {}) {
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
  let statusFilter = (opts.status || 'all').toLowerCase();
  if (statusFilter === 'grace') statusFilter = 'in_grace';
  const packageFilter = (opts.packageName || '').trim().toLowerCase();
  const includeNoFeeTiers = opts.includeNoFeeTiers !== false;

  await Package.ensureDefaults();
  _packagesCache = null;
  const packages = await Package.find({}).lean();
  _packagesCache = packages;
  _packagesCacheAt = Date.now();

  // Fee is always for the **previous UTC calendar month** (paid by end of grace in the current month).
  const currentMonthStart = startOfUtcMonth(now);
  const pastMonthStart = addUtcMonths(currentMonthStart, -1);
  const pastMonthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(pastMonthStart);

  const packagePayments = await Payment.aggregate([
    { $match: { status: 'completed', type: 'package' } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$user', payment: { $first: '$$ROOT' } } }
  ]);

  const userIds = packagePayments.map((p) => p._id).filter(Boolean);
  const students = await User.find({ _id: { $in: userIds }, role: 'student' })
    .select('firstName lastName email isActive isVerified monthlyFeeBillingStartsMonthStart')
    .lean();
  const userMap = new Map(students.map((u) => [u._id.toString(), u]));

  const rows = [];

  for (const entry of packagePayments) {
    const uid = entry._id?.toString?.() || String(entry._id);
    const u = userMap.get(uid);
    if (!u) continue;

    const pkg = resolvePackageFromList(entry.payment, packages);
    if (!pkg) continue;

    const displayName = ((entry.payment?.package?.name || pkg.name || '').trim() || pkg.name);
    if (packageFilter && !displayName.toLowerCase().includes(packageFilter)) continue;

    // Lifetime / no monthly fee — same table, status "No monthly fee" (not overdue)
    if (!pkg.monthlyFeeEnabled) {
      if (!includeNoFeeTiers) continue;
      const showNoFeeRow = statusFilter === 'all' || statusFilter === 'no_fee_required';
      if (!showNoFeeRow) continue;
      rows.push({
        user: u,
        packageName: displayName,
        monthlyFeeAmount: 0,
        /** Amount owed for this cycle (0 for lifetime / no-fee tiers) */
        amountPending: 0,
        graceDays: 0,
        dueForMonth: pastMonthStart.toISOString(),
        daysOverdue: 0,
        feeStatus: 'no_fee_required',
        pendingPaymentId: null,
        hasPendingPayment: false
      });
      continue;
    }

    const graceDays = Number(pkg.monthlyFeeGraceDays ?? 3);
    const freeMonths = Number(pkg.monthlyFeeFreeMonths ?? 0);
    const purchasedAt = entry.payment?.createdAt ? new Date(entry.payment.createdAt) : now;
    const freeUntil = addUtcMonths(startOfUtcMonth(purchasedAt), freeMonths);

    if (now < freeUntil) continue;
    // Still inside package free-months window for this billing month
    if (pastMonthStart < freeUntil) continue;

    const billingAnchorStart = u.monthlyFeeBillingStartsMonthStart
      ? startOfUtcMonth(new Date(u.monthlyFeeBillingStartsMonthStart))
      : null;
    if (
      billingAnchorStart &&
      pastMonthStart.getTime() < billingAnchorStart.getTime()
    ) {
      continue;
    }

    const paid = await Payment.findOne({
      user: entry._id,
      status: 'completed',
      type: 'monthly_fee',
      createdAt: { $gte: pastMonthStart, $lt: currentMonthStart }
    })
      .select('_id createdAt')
      .lean();

    if (paid) continue;

    const pendingPay = await Payment.findOne({
      user: entry._id,
      status: 'pending',
      type: 'monthly_fee'
    })
      .sort({ createdAt: -1 })
      .select('_id createdAt finalAmount amount currency')
      .lean();

    const packageFee = Number(pkg.monthlyFeeAmount ?? 50);
    const pendingTxnAmount = pendingPay
      ? Number(pendingPay.finalAmount ?? pendingPay.amount ?? packageFee)
      : null;

    const inGrace = now.getUTCDate() <= graceDays;
    let feeStatus;
    if (pendingPay) {
      feeStatus = 'pending_confirmation';
    } else if (inGrace) {
      feeStatus = 'in_grace';
    } else {
      feeStatus = 'overdue';
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'grace' && feeStatus !== 'in_grace') continue;
      if (statusFilter === 'in_grace' && feeStatus !== 'in_grace') continue;
      if (statusFilter === 'overdue' && feeStatus !== 'overdue') continue;
      if (statusFilter === 'pending_confirmation' && feeStatus !== 'pending_confirmation') continue;
    }

    const daysOverdue = inGrace ? 0 : Math.max(0, now.getUTCDate() - graceDays);

    /** Dollar amount for this cycle: pending txn amount if awaiting review, else standard package fee */
    const amountPending = pendingPay ? pendingTxnAmount : packageFee;

    rows.push({
      user: u,
      packageName: displayName,
      monthlyFeeAmount: packageFee,
      amountPending,
      pendingPaymentAmount: pendingTxnAmount,
      graceDays,
      dueForMonth: pastMonthStart.toISOString(),
      daysOverdue,
      feeStatus,
      pendingPaymentId: pendingPay?._id ? String(pendingPay._id) : null,
      hasPendingPayment: !!pendingPay
    });
  }

  rows.sort((a, b) => {
    const order = { overdue: 0, pending_confirmation: 1, in_grace: 2, no_fee_required: 4 };
    const ao = order[a.feeStatus] ?? 3;
    const bo = order[b.feeStatus] ?? 3;
    if (ao !== bo) return ao - bo;
    return b.daysOverdue - a.daysOverdue;
  });

  return {
    asOf: now.toISOString(),
    /** Start of the UTC month the fee is for (previous calendar month) */
    dueForMonth: pastMonthStart.toISOString(),
    pastMonthLabel,
    currentMonthStart: currentMonthStart.toISOString(),
    graceUtcDays: 3,
    note:
      now.getUTCDate() <= 3
        ? 'UTC day 1–3: students in grace still owe until they pay; they are listed with status “In grace”.'
        : undefined,
    count: rows.length,
    users: rows
  };
}

/** @deprecated Use listPendingMonthlyFeeStudents; kept for compatibility */
async function listOverdueMonthlyFeeUsers(now = new Date()) {
  const r = await listPendingMonthlyFeeStudents({ now, status: 'overdue' });
  return {
    asOf: r.asOf,
    dueForMonth: r.dueForMonth,
    count: r.count,
    users: r.users.map((row) => ({
      user: row.user,
      packageName: row.packageName,
      monthlyFeeAmount: row.monthlyFeeAmount,
      graceDays: row.graceDays,
      dueForMonth: row.dueForMonth,
      daysOverdue: row.daysOverdue
    }))
  };
}

module.exports = {
  startOfUtcMonth,
  addUtcMonths,
  feeMonthCoveredForPaymentDate,
  resolvePackageFromList,
  resolvePackageFromPayment,
  getMonthlyFeeStatusForUser,
  listPendingMonthlyFeeStudents,
  listOverdueMonthlyFeeUsers
};
