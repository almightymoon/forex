/**
 * Fix Existing Commission Calculations
 * 
 * This script recalculates all existing referral commissions to use the referral pool
 * instead of the full payment amount.
 * 
 * Usage: node scripts/fix-existing-commissions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BalanceTransaction = require('../models/BalanceTransaction');
const ReferralCommission = require('../models/ReferralCommission');
const Payment = require('../models/Payment');
const User = require('../models/User');
const ReferralCommissionService = require('../services/referralCommissionService');

async function fixExistingCommissions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://moon:947131@cluster0.gvga3.mongodb.net/';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const commissionService = new ReferralCommissionService();
    
    // Find all referral commission transactions
    const transactions = await BalanceTransaction.find({
      type: 'referral_commission'
    }).populate('relatedPayment');

    console.log(`Found ${transactions.length} referral commission transactions to check\n`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    const userBalanceAdjustments = {}; // Track balance adjustments per user

    for (const transaction of transactions) {
      try {
        if (!transaction.relatedPayment) {
          console.log(`⚠️  Transaction ${transaction._id}: No related payment, skipping`);
          skipped++;
          continue;
        }

        const payment = transaction.relatedPayment;
        
        // Only process package payments
        if (payment.type !== 'package') {
          console.log(`⚠️  Transaction ${transaction._id}: Not a package payment, skipping`);
          skipped++;
          continue;
        }

        const packageAmount = Number(payment.finalAmount ?? payment.amount) || 0;
        const packageNameRaw = payment.package?.name || 'Unknown';
        const packageName = commissionService.normalizePackageName(packageNameRaw);
        
        // Get referral pool (dynamic from Package config)
        const cfg = await commissionService.getCommissionConfig(packageNameRaw);
        const poolPct = Number(cfg.referralPoolPercentage) || 0;
        const referralPool = Math.round((packageAmount * poolPct) * 100) / 100;
        
        // Get level from metadata or calculate from commission rate
        let level = 1;
        if (transaction.metadata && transaction.metadata.level) {
          level = parseInt(transaction.metadata.level);
        } else {
          // Try to determine level from commission rate
          const currentRate = transaction.amount / packageAmount;
          const rates = { 1: 0.20, 2: 0.15, 3: 0.15, 4: 0.10, 5: 0.10 };
          for (let l = 1; l <= 5; l++) {
            if (Math.abs(currentRate - rates[l]) < 0.01) {
              level = l;
              break;
            }
          }
        }

        // Calculate correct commission from referral pool
        const commissionRate = (cfg.commissionRates?.[level] ?? commissionService.commissionRates[level]) || 0;
        const correctCommission = Math.round((referralPool * commissionRate) * 100) / 100;
        const oldCommission = transaction.amount;
        const difference = correctCommission - oldCommission;

        // Check if commission needs fixing
        const wrongIfFromPackage = Math.round((packageAmount * commissionRate) * 100) / 100;
        const isWrong = Math.abs(oldCommission - wrongIfFromPackage) < 0.01 && referralPool < packageAmount - 0.01;

        if (!isWrong && Math.abs(oldCommission - correctCommission) < 0.01) {
          console.log(`✓ Transaction ${transaction._id}: Already correct ($${oldCommission.toFixed(2)})`);
          skipped++;
          continue;
        }

        console.log(`\n🔧 Fixing transaction ${transaction._id}:`);
        console.log(`   Payment: ${packageNameRaw} - $${packageAmount}`);
        console.log(`   Referral Pool: $${referralPool.toFixed(2)}`);
        console.log(`   Level: ${level} (${(commissionRate * 100).toFixed(0)}%)`);
        console.log(`   Old Commission: $${oldCommission.toFixed(2)}`);
        console.log(`   Correct Commission: $${correctCommission.toFixed(2)}`);
        console.log(`   Difference: $${difference.toFixed(2)}`);

        // Update transaction amount
        transaction.amount = correctCommission;
        
        // Update balance after if it exists
        if (transaction.balanceAfter) {
          transaction.balanceAfter = (transaction.balanceAfter - oldCommission) + correctCommission;
        }

        // Update metadata
        if (!transaction.metadata) {
          transaction.metadata = {};
        }
        transaction.metadata.level = level.toString();
        transaction.metadata.packageName = packageName;
        transaction.metadata.packageAmount = packageAmount.toString();
        transaction.metadata.referralPool = referralPool.toFixed(2);
        transaction.metadata.commissionRate = (commissionRate * 100).toString();
        transaction.metadata.commissionFromPool = 'true';
        transaction.metadata.fixedBy = 'fix-existing-commissions-script';
        transaction.metadata.fixedAt = new Date().toISOString();
        transaction.metadata.oldCommission = oldCommission.toFixed(2);

        // Update description
        transaction.description = `Level ${level} referral commission from ${transaction.description.split("'s")[1] || 'purchase'}`;
        
        if (transaction.notes) {
          transaction.notes = `Package: ${packageName}, Package Amount: $${packageAmount}, Referral Pool: $${referralPool.toFixed(2)}, Commission Rate: ${(commissionRate * 100).toFixed(0)}% of pool (Fixed from $${oldCommission.toFixed(2)})`;
        }

        await transaction.save();

        // Track balance adjustment for user
        const userId = transaction.user.toString();
        if (!userBalanceAdjustments[userId]) {
          userBalanceAdjustments[userId] = 0;
        }
        userBalanceAdjustments[userId] += difference;

        fixed++;
        console.log(`   ✅ Fixed!`);

      } catch (error) {
        console.error(`❌ Error fixing transaction ${transaction._id}:`, error.message);
        errors++;
      }
    }

    // Update user balances and referral stats
    console.log(`\n📊 Updating user balances and stats...`);
    let balanceUpdates = 0;
    let statsUpdates = 0;

    for (const [userId, adjustment] of Object.entries(userBalanceAdjustments)) {
      if (Math.abs(adjustment) < 0.01) continue; // Skip if no significant change

      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log(`⚠️  User ${userId} not found, skipping balance update`);
          continue;
        }

        // Update balance
        const oldBalance = user.balance || 0;
        user.balance = Math.max(0, (user.balance || 0) + adjustment);
        await user.save();
        balanceUpdates++;

        console.log(`   User ${user.email}: Balance adjusted by $${adjustment.toFixed(2)} (${oldBalance.toFixed(2)} → ${user.balance.toFixed(2)})`);

        // Recalculate total earnings from all BalanceTransactions AND ReferralCommissions
        const allBalanceCommissions = await BalanceTransaction.find({
          user: userId,
          type: 'referral_commission'
        });

        const allReferralCommissions = await ReferralCommission.find({
          referrer: userId,
          status: 'paid'
        });

        const totalEarningsFromBalance = allBalanceCommissions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalEarningsFromReferral = allReferralCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
        
        // Use the higher value (they should match, but use max to be safe)
        const totalEarnings = Math.max(totalEarningsFromBalance, totalEarningsFromReferral);

        // Update referral stats
        if (!user.referralStats) {
          user.referralStats = {
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
        
        const oldEarnings = user.referralStats.totalEarnings || 0;
        user.referralStats.totalEarnings = totalEarnings;
        await user.save();
        statsUpdates++;

        if (Math.abs(oldEarnings - totalEarnings) > 0.01) {
          console.log(`   User ${user.email}: Total earnings updated (${oldEarnings.toFixed(2)} → ${totalEarnings.toFixed(2)})`);
        }

      } catch (error) {
        console.error(`❌ Error updating user ${userId}:`, error.message);
      }
    }

    // Now fix ReferralCommission model records (used by earnings page)
    console.log('\n' + '='.repeat(60));
    console.log('🔧 Fixing ReferralCommission model records...');
    console.log('='.repeat(60));
    
    const referralCommissions = await ReferralCommission.find().populate('payment');
    console.log(`Found ${referralCommissions.length} ReferralCommission records to check\n`);

    let rcFixed = 0;
    let rcSkipped = 0;
    let rcErrors = 0;

    for (const commission of referralCommissions) {
      try {
        if (!commission.payment) {
          console.log(`⚠️  Commission ${commission._id}: No related payment, skipping`);
          rcSkipped++;
          continue;
        }

        const payment = commission.payment;
        
        // Only process package payments
        if (payment.type !== 'package') {
          console.log(`⚠️  Commission ${commission._id}: Not a package payment, skipping`);
          rcSkipped++;
          continue;
        }

        const packageAmount = Number(payment.finalAmount ?? payment.amount) || 0;
        const packageNameRaw = payment.package?.name || 'Unknown';
        const packageName = commissionService.normalizePackageName(packageNameRaw);
        
        // Get referral pool
        const referralPool = commissionService.getReferralPool(packageNameRaw, packageAmount);
        
        // Get level from commission
        const level = commission.level || 1;
        
        // Calculate correct commission from referral pool
        const commissionRate = commissionService.commissionRates[level] || 0;
        const correctCommission = Math.round((referralPool * commissionRate) * 100) / 100;
        const oldCommission = commission.commissionAmount;
        const difference = correctCommission - oldCommission;

        // Check if commission needs fixing
        const wrongIfFromPackage = Math.round((packageAmount * commissionRate) * 100) / 100;
        const isWrong = Math.abs(oldCommission - wrongIfFromPackage) < 0.01 && referralPool < packageAmount - 0.01;

        if (!isWrong && Math.abs(oldCommission - correctCommission) < 0.01) {
          console.log(`✓ Commission ${commission._id}: Already correct ($${oldCommission.toFixed(2)})`);
          rcSkipped++;
          continue;
        }

        console.log(`\n🔧 Fixing ReferralCommission ${commission._id}:`);
        console.log(`   Payment: ${packageNameRaw} - $${packageAmount}`);
        console.log(`   Referral Pool: $${referralPool.toFixed(2)}`);
        console.log(`   Level: ${level} (${(commissionRate * 100).toFixed(0)}%)`);
        console.log(`   Old Commission: $${oldCommission.toFixed(2)}`);
        console.log(`   Correct Commission: $${correctCommission.toFixed(2)}`);
        console.log(`   Difference: $${difference.toFixed(2)}`);

        // Update commission amount
        commission.commissionAmount = correctCommission;
        await commission.save();

        rcFixed++;
        console.log(`   ✅ Fixed!`);

      } catch (error) {
        console.error(`❌ Error fixing ReferralCommission ${commission._id}:`, error.message);
        rcErrors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed BalanceTransactions: ${fixed} commission(s)`);
    console.log(`✅ Fixed ReferralCommissions: ${rcFixed} commission(s)`);
    console.log(`⚠️  Skipped: ${skipped + rcSkipped} commission(s) (already correct or invalid)`);
    console.log(`❌ Errors: ${errors + rcErrors} commission(s)`);
    console.log(`💰 Balance Updates: ${balanceUpdates} user(s)`);
    console.log(`📈 Stats Updates: ${statsUpdates} user(s)`);
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Script completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixExistingCommissions();
