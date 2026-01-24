/**
 * Fix Level 5 commission overpayment: hue@gmail.com bought FX Legacy $1000.
 * testing@gmail.com (Level 5 referrer) incorrectly received $100; should be $25.
 * This script debits $75 from testing@gmail.com.
 *
 * Run from backend dir: node scripts/fix-commission-overpayment.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BalanceTransaction = require('../models/BalanceTransaction');
const User = require('../models/User');

const BUYER_EMAIL = 'hue@gmail.com';
const REFERRER_EMAIL = 'testing@gmail.com';
const OVERPAYMENT_AMOUNT = 75; // $100 - $25 correct
const CORRECT_L5_AMOUNT = 25;

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.\n');

    const referrer = await User.findOne({ email: REFERRER_EMAIL.toLowerCase() });
    if (!referrer) {
      console.error('Referrer not found:', REFERRER_EMAIL);
      process.exit(1);
    }

    // Find Level 5 commission from hue's purchase ($100 = overpayment, $25 = correct)
    const allL5 = await BalanceTransaction.find({
      type: 'referral_commission',
      user: referrer._id,
      $or: [{ amount: 100 }, { amount: 25 }]
    })
      .sort({ createdAt: -1 })
      .lean();

    const tx = allL5.find((t) => {
      const m = t.metadata || {};
      const email = (typeof m.get === 'function' ? m.get('buyerEmail') : m.buyerEmail) || '';
      const lvl = (typeof m.get === 'function' ? m.get('level') : m.level) || '';
      return String(email).toLowerCase().includes('hue') && String(lvl) === '5';
    }) || allL5.find((t) => t.amount === 100);

    if (!tx) {
      console.log('No Level 5 referral_commission from hue found for', REFERRER_EMAIL);
      const any = await BalanceTransaction.find({ type: 'referral_commission', user: referrer._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('amount metadata notes createdAt')
        .lean();
      console.log('Recent commission txns:', any?.length || 0);
      any?.forEach((t, i) => {
        const m = t.metadata || {};
        const l = typeof m.get === 'function' ? m.get('level') : m.level;
        console.log(`  ${i + 1}. $${t.amount} L${l || '?'}`, (t.notes || '').slice(0, 70));
      });
      process.exit(1);
    }

    if (tx.amount === 25) {
      console.log('Level 5 commission from hue is already $25 (correct). No overpayment to fix.');
      return;
    }

    const meta = tx.metadata || {};
    const buyerEmail = (typeof meta.get === 'function' ? meta.get('buyerEmail') : meta.buyerEmail) || '';
    const level = (typeof meta.get === 'function' ? meta.get('level') : meta.level) || '';
    console.log('Found $100 overpayment. Buyer:', buyerEmail, '| Level:', level);

    const fresh = await User.findById(referrer._id);
    const balanceBefore = (fresh?.balance ?? referrer.balance ?? 0);
    if (balanceBefore < OVERPAYMENT_AMOUNT) {
      console.error(`Insufficient balance: $${balanceBefore}. Need $${OVERPAYMENT_AMOUNT} to debit.`);
      process.exit(1);
    }

    const description = `Commission correction: Level 5 overpayment for ${BUYER_EMAIL}'s FX Legacy $1000 purchase (was $100, should be $${CORRECT_L5_AMOUNT}).`;
    const notes = `Reversal of overpayment. Original commission txn: ${tx._id}.`;

    const debit = await BalanceTransaction.createTransaction({
      user: referrer._id,
      type: 'debit',
      amount: -OVERPAYMENT_AMOUNT,
      description,
      notes,
      performedBy: null
    });

    console.log('Debit transaction created:', debit._id);
    console.log('Amount: -$' + OVERPAYMENT_AMOUNT);
    console.log('Description:', description);
    console.log('Referrer balance: $' + balanceBefore, '->', '$' + (balanceBefore - OVERPAYMENT_AMOUNT));
    console.log('\nDone.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
