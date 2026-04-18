/**
 * Seed test students for monthly-fee / overdue scenarios.
 *
 * Usage (from backend/):  node scripts/seed-monthly-fee-test-users.js
 *
 * All accounts use the same password (see TEST_PASSWORD below).
 * Removes and recreates the fixed seed emails below (idempotent re-run).
 *
 * User `createdAt` (signup) is set to dates in a *previous* month so admin/UI
 * tests see realistic signup times (not "today").
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Package = require('../models/Package');

const TEST_PASSWORD = 'TestPass123!';

const SEED_EMAILS = [
  'monthlyfee-overdue-launch@example.net',
  'monthlyfee-overdue-scale@example.net',
  'monthlyfee-no-fee-legacy@example.net',
  'monthlyfee-paid-launch@example.net'
];

function getMongoUri() {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
  const dbName = process.env.DB_NAME;
  if (dbName && uri) {
    const match = uri.match(/^(mongodb(\+srv)?:\/\/[^/]+)(\/([^?]*))?(\?.*)?$/);
    if (match) {
      const pathPart = match[4];
      if (pathPart === undefined || pathPart === '' || pathPart === '/') {
        uri = match[1] + '/' + dbName + (match[5] || '');
      }
    }
  }
  return uri;
}

/**
 * Build seed rows from "now" so overdue + signup stay aligned month-to-month.
 * - Overdue Launch / Paid Launch: signup & package in **previous calendar month** (UTC).
 * - Scale / Legacy: fixed old dates (multi-month free tier / lifetime).
 */
function getSpecs(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  /** 10th of previous month UTC — signup */
  const signupPrevMonth = new Date(Date.UTC(y, m - 1, 10, 10, 0, 0));
  /** 14th of previous month — package completed (Launch tiers: fee for that month applies next month) */
  const pkgPurchasePrevMonth = new Date(Date.UTC(y, m - 1, 14, 12, 0, 0));
  /** Paid user: bought a few days earlier, fee paid mid previous month */
  const pkgPurchasePaidLaunch = new Date(Date.UTC(y, m - 1, 8, 12, 0, 0));
  const feePaidPriorMonth = new Date(Date.UTC(y, m - 1, 18, 14, 0, 0));

  return [
    {
      email: 'monthlyfee-overdue-launch@example.net',
      firstName: 'Overdue',
      lastName: 'Launch',
      packageName: 'FX Launch',
      price: 100,
      signupAt: signupPrevMonth,
      purchasedAt: pkgPurchasePrevMonth
    },
    {
      email: 'monthlyfee-overdue-scale@example.net',
      firstName: 'Overdue',
      lastName: 'Scale',
      packageName: 'FX Scale',
      price: 250,
      signupAt: new Date(Date.UTC(2025, 6, 5, 9, 0, 0)),
      purchasedAt: new Date(Date.UTC(2025, 7, 1, 12, 0, 0)),
      /** Pending monthly fee for admin “pending review” / confirm flows ($50 USD) */
      pendingMonthlyFeeUsd: 50
    },
    {
      email: 'monthlyfee-no-fee-legacy@example.net',
      firstName: 'NoFee',
      lastName: 'Legacy',
      packageName: 'FX Legacy',
      price: 1000,
      signupAt: new Date(Date.UTC(2025, 5, 12, 11, 0, 0)),
      purchasedAt: new Date(Date.UTC(2025, 5, 20, 12, 0, 0))
    },
    {
      email: 'monthlyfee-paid-launch@example.net',
      firstName: 'FeePaid',
      lastName: 'Launch',
      packageName: 'FX Launch',
      price: 100,
      signupAt: signupPrevMonth,
      purchasedAt: pkgPurchasePaidLaunch,
      payPriorMonthFee: true,
      priorMonthFeePaidAt: feePaidPriorMonth
    }
  ];
}

async function removeExistingTestUsers() {
  const existing = await User.find({ email: { $in: SEED_EMAILS } }).select('_id').lean();
  const ids = existing.map((u) => u._id);
  if (ids.length) {
    await Payment.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    console.log(`Removed ${ids.length} prior test user(s) and their payments.`);
  }
}

/** Set Mongoose timestamps without re-running document middleware. */
async function setUserSignupDate(userId, at) {
  await User.collection.updateOne(
    { _id: userId },
    { $set: { createdAt: at, updatedAt: at } }
  );
}

async function seed() {
  const mongoUri = getMongoUri();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected. DB:', mongoose.connection.db?.databaseName);

  await Package.ensureDefaults();

  const now = new Date();
  const specs = getSpecs(now);

  if (now.getUTCDate() <= 3) {
    console.warn(
      '\n⚠️  UTC calendar day is 1–3: admin overdue list stays empty until day 4+ (grace). Auth may still block after grace.\n'
    );
  }

  await removeExistingTestUsers();

  console.log('\nCreating users and package payments...\n');
  console.log(`Reference "now" (UTC): ${now.toISOString()}`);
  console.log(`Dynamic overdue Launch signup/package: ${specs[0].signupAt.toISOString()} / ${specs[0].purchasedAt.toISOString()}\n`);

  for (const spec of specs) {
    const user = await User.create({
      email: spec.email.toLowerCase(),
      password: TEST_PASSWORD,
      firstName: spec.firstName,
      lastName: spec.lastName,
      role: 'student',
      isVerified: true,
      isActive: true,
      country: 'Pakistan'
    });

    await setUserSignupDate(user._id, spec.signupAt);

    const txBase = `seed-mf-${spec.email.split('@')[0]}`.replace(/[^a-z0-9-]/gi, '').slice(0, 36);
    const pkgPayment = await Payment.create({
      user: user._id,
      amount: spec.price,
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      status: 'completed',
      type: 'package',
      package: {
        name: spec.packageName,
        price: spec.price
      },
      description: `Seed test package: ${spec.packageName}`,
      discountAmount: 0,
      finalAmount: spec.price,
      transactionId: `${txBase}-pkg`,
      adminConfirmed: true
    });

    await Payment.updateOne(
      { _id: pkgPayment._id },
      { $set: { createdAt: spec.purchasedAt, updatedAt: spec.purchasedAt } }
    );

    if (spec.payPriorMonthFee && spec.priorMonthFeePaidAt) {
      const fee = await Payment.create({
        user: user._id,
        amount: 50,
        currency: 'USD',
        paymentMethod: 'bank_transfer',
        status: 'completed',
        type: 'monthly_fee',
        description: 'Seed: prior month monthly fee (paid)',
        discountAmount: 0,
        finalAmount: 50,
        transactionId: `${txBase}-mf-prev`,
        adminConfirmed: true
      });
      await Payment.updateOne(
        { _id: fee._id },
        { $set: { createdAt: spec.priorMonthFeePaidAt, updatedAt: spec.priorMonthFeePaidAt } }
      );
    }

    if (spec.pendingMonthlyFeeUsd != null && Number(spec.pendingMonthlyFeeUsd) > 0) {
      const amt = Number(spec.pendingMonthlyFeeUsd);
      await Payment.create({
        user: user._id,
        amount: amt,
        currency: 'USD',
        paymentMethod: 'binance_wallet',
        status: 'pending',
        type: 'monthly_fee',
        description: 'Seed: pending monthly fee (awaiting admin confirmation)',
        discountAmount: 0,
        finalAmount: amt,
        transactionId: `${txBase}-mf-pending`,
        binanceWallet: {
          network: 'TRC20',
          transactionHash: `seed-${txBase}-pending-tx`
        },
        adminConfirmed: false
      });
    }

    console.log(
      `  ✓ ${spec.email} — signup ${spec.signupAt.toISOString().slice(0, 10)} — ${spec.packageName} paid ${spec.purchasedAt.toISOString().slice(0, 10)}`
    );
  }

  console.log(`
Done.

--- Test credentials (all same password) ---
Password: ${TEST_PASSWORD}

| Account | Purpose |
|---------|---------|
| monthlyfee-overdue-launch@example.net | FX Launch — overdue; signup in **previous month** (UTC) |
| monthlyfee-overdue-scale@example.net | FX Scale — overdue; **$50 pending** monthly fee (Binance, awaiting confirm) |
| monthlyfee-no-fee-legacy@example.net | FX Legacy — no monthly fee |
| monthlyfee-paid-launch@example.net | FX Launch — prior month fee paid |

Remove later: delete these users or re-run this script (replaces them).
`);
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
