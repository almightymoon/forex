/**
 * Seed ~10 verified referral users under a student account for tree UI testing.
 *
 * Usage (from backend/):
 *   node scripts/seed-referral-tree.js
 *   node scripts/seed-referral-tree.js student@forexnavigators.com
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');

function getMongoUri() {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = (process.env.DB_NAME || '').trim();
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

const SEED_EMAIL_PREFIX = 'ref-tree-';

/** 6 direct + 4 nested = 10 total */
const REFERRAL_TREE = [
  { email: `${SEED_EMAIL_PREFIX}1@forexnavigators.com`, firstName: 'Alex', lastName: 'Chen', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}2@forexnavigators.com`, firstName: 'Maria', lastName: 'Santos', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}3@forexnavigators.com`, firstName: 'James', lastName: 'Wilson', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}4@forexnavigators.com`, firstName: 'Priya', lastName: 'Sharma', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}5@forexnavigators.com`, firstName: 'Omar', lastName: 'Hassan', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}6@forexnavigators.com`, firstName: 'Emma', lastName: 'Brooks', parent: 'root' },
  { email: `${SEED_EMAIL_PREFIX}7@forexnavigators.com`, firstName: 'Lucas', lastName: 'Nguyen', parent: `${SEED_EMAIL_PREFIX}1@forexnavigators.com` },
  { email: `${SEED_EMAIL_PREFIX}8@forexnavigators.com`, firstName: 'Sofia', lastName: 'Martinez', parent: `${SEED_EMAIL_PREFIX}1@forexnavigators.com` },
  { email: `${SEED_EMAIL_PREFIX}9@forexnavigators.com`, firstName: 'Daniel', lastName: 'Okonkwo', parent: `${SEED_EMAIL_PREFIX}2@forexnavigators.com` },
  { email: `${SEED_EMAIL_PREFIX}10@forexnavigators.com`, firstName: 'Yuki', lastName: 'Tanaka', parent: `${SEED_EMAIL_PREFIX}2@forexnavigators.com` }
];

const DEFAULT_PASSWORD = 'Student123!';
const PACKAGE_NAME = 'FX Launch';
const PACKAGE_PRICE = 99;

async function ensureReferralCode(user) {
  if (user.referralCode && String(user.referralCode).trim()) return user.referralCode;
  const referralService = require('../services/referralService');
  await referralService.generateReferralCode(user);
  const fresh = await User.findById(user._id).select('referralCode').lean();
  return fresh?.referralCode;
}

async function ensurePackagePayment(userId, email) {
  const existing = await Payment.findOne({
    user: userId,
    type: 'package',
    status: 'completed'
  }).select('_id').lean();

  if (existing) return existing._id;

  const txBase = `seed-ref-tree-${email.split('@')[0]}`.replace(/[^a-z0-9-]/gi, '').slice(0, 36);
  return Payment.create({
    user: userId,
    amount: PACKAGE_PRICE,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    status: 'completed',
    type: 'package',
    package: { name: PACKAGE_NAME, price: PACKAGE_PRICE },
    description: `Seed referral tree package: ${PACKAGE_NAME}`,
    discountAmount: 0,
    finalAmount: PACKAGE_PRICE,
    transactionId: `${txBase}-pkg`,
    adminConfirmed: true
  });
}

async function main() {
  const sponsorEmail = (process.argv[2] || 'student@forexnavigators.com').toLowerCase().trim();
  const mongoUri = getMongoUri();

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected. DB:', mongoose.connection.db?.databaseName);

  const sponsor = await User.findOne({ email: sponsorEmail });
  if (!sponsor) {
    throw new Error(`Sponsor user not found: ${sponsorEmail}`);
  }

  const sponsorCode = await ensureReferralCode(sponsor);
  if (!sponsorCode) {
    throw new Error(`Failed to resolve referral code for ${sponsorEmail}`);
  }

  console.log(`\nSponsor: ${sponsor.firstName} ${sponsor.lastName} (${sponsorEmail})`);
  console.log(`Referral code: ${sponsorCode}\n`);

  const seedEmails = REFERRAL_TREE.map((r) => r.email.toLowerCase());
  console.log('Removing previous ref-tree seed users...');
  const oldUsers = await User.find({ email: { $in: seedEmails } }).select('_id email').lean();
  if (oldUsers.length) {
    const oldIds = oldUsers.map((u) => u._id);
    await Payment.deleteMany({ user: { $in: oldIds } });
    await User.deleteMany({ _id: { $in: oldIds } });
    console.log(`  Removed ${oldUsers.length} existing seed users`);
  }

  const referralCodesByEmail = new Map();

  for (const spec of REFERRAL_TREE) {
    let parentCode = sponsorCode;
    if (spec.parent !== 'root') {
      parentCode = referralCodesByEmail.get(spec.parent.toLowerCase());
      if (!parentCode) {
        throw new Error(`Parent referral not created yet: ${spec.parent}`);
      }
    }

    const user = await User.create({
      email: spec.email.toLowerCase(),
      password: DEFAULT_PASSWORD,
      firstName: spec.firstName,
      lastName: spec.lastName,
      role: 'student',
      isVerified: true,
      isActive: true,
      country: 'Pakistan',
      parentReferralCode: parentCode,
      referredByDefaultCode: false
    });

    const code = await ensureReferralCode(user);
    referralCodesByEmail.set(spec.email.toLowerCase(), code);
    await ensurePackagePayment(user._id, spec.email);

    const levelLabel = spec.parent === 'root' ? 'direct' : 'nested';
    console.log(`  ✓ ${spec.firstName} ${spec.lastName} (${levelLabel}, parent=${parentCode})`);
  }

  const referralService = require('../services/referralService');
  const tree = await referralService.getReferralTree(sponsor._id);

  console.log('\n--- Referral tree summary ---');
  console.log(`Direct referrals: ${tree.stats?.totalReferrals ?? tree.tree?.length ?? 0}`);
  console.log(`Verified in tree: ${tree.stats?.verifiedReferrals ?? 'n/a'}`);
  console.log(`Tree nodes (top level): ${tree.tree?.length ?? 0}`);
  console.log('\nRefresh the Referrals → Tree tab in the browser.');
  console.log(`Log in as: ${sponsorEmail}\n`);
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
