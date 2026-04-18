/**
 * Add a $50 USD pending monthly_fee for monthlyfee-overdue-scale@example.net
 * (does not delete other users; safe if payment already exists — skips).
 *
 * Usage (from backend/):  node scripts/add-pending-monthly-fee-overdue-scale.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');

const EMAIL = 'monthlyfee-overdue-scale@example.net';
const AMOUNT = 50;

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

async function main() {
  await mongoose.connect(getMongoUri());
  const user = await User.findOne({ email: EMAIL.toLowerCase() }).select('_id').lean();
  if (!user) {
    console.error(`User not found: ${EMAIL}. Run: node scripts/seed-monthly-fee-test-users.js`);
    process.exit(1);
  }

  const existing = await Payment.findOne({
    user: user._id,
    type: 'monthly_fee',
    status: 'pending'
  }).lean();

  if (existing) {
    console.log(`Already has pending monthly_fee (${existing._id}). Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const txBase = 'seed-mf-monthlyfee-overdue-scale';
  await Payment.create({
    user: user._id,
    amount: AMOUNT,
    currency: 'USD',
    paymentMethod: 'binance_wallet',
    status: 'pending',
    type: 'monthly_fee',
    description: 'Seed/manual: pending monthly fee (awaiting admin confirmation)',
    discountAmount: 0,
    finalAmount: AMOUNT,
    transactionId: `${txBase}-mf-pending-${Date.now()}`,
    binanceWallet: {
      network: 'TRC20',
      transactionHash: `seed-${txBase}-pending-tx`
    },
    adminConfirmed: false
  });

  console.log(`Added $${AMOUNT} USD pending monthly_fee for ${EMAIL}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
