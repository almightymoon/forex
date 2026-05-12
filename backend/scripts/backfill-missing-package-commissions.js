#!/usr/bin/env node
/**
 * Preview or apply missing package referral commissions (same rules as checkout + admin backfill).
 *
 * Dry run (default): scans recent completed package payments with no referral_commission rows and prints a summary.
 * Apply: requires explicit payment ids (safety).
 *
 * Usage:
 *   node scripts/backfill-missing-package-commissions.js
 *   node scripts/backfill-missing-package-commissions.js --limit=300
 *   node scripts/backfill-missing-package-commissions.js --apply --ids=64a...,64b...
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ReferralCommissionService = require('../services/referralCommissionService');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: 200, apply: false, ids: null };
  for (const a of args) {
    if (a === '--apply') out.apply = true;
    else if (a.startsWith('--limit=')) {
      const n = parseInt(a.slice('--limit='.length), 10);
      out.limit = Number.isFinite(n) ? Math.min(Math.max(n, 1), 500) : 200;
    } else if (a.startsWith('--ids=')) {
      out.ids = a
        .slice('--ids='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return out;
}

function printEligibleSummary(eligible) {
  for (const row of eligible) {
    console.log('\n---');
    console.log('paymentId:', row.paymentId);
    console.log('  buyer:', row.buyer?.email, '| package:', row.packageNameRaw, '→ tier:', row.resolvedPackageName);
    console.log('  sale $' + row.packageAmount.toFixed(2), '| pool $' + row.referralPool.toFixed(2), `(${(row.referralPoolPercentage * 100).toFixed(0)}%)`);
    console.log('  total to credit referrers: $' + row.totalCommissionsToCredit.toFixed(2));
    for (const lv of row.levels || []) {
      console.log(
        `    L${lv.level}  ${lv.rateOfPoolDisplay} of pool → $${lv.amount.toFixed(2)} → ${lv.payTo?.email} (${lv.payTo?.name || ''})`
      );
    }
  }
}

async function main() {
  const { limit, apply, ids } = parseArgs();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI (or MONGO_URI) in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const svc = new ReferralCommissionService();

  const preview = await svc.previewBackfillMissingPackageCommissions({
    limit,
    paymentIds: ids && ids.length ? ids : undefined
  });

  console.log('Scanned (no commission rows yet):', preview.scannedWithNoCommissionRows);
  console.log('Eligible (would pay > 0):', preview.eligible.length);
  console.log('Skipped:', preview.skipped.length);
  if (preview.skippedCounts && Object.keys(preview.skippedCounts).length) {
    console.log('Skipped counts:', preview.skippedCounts);
  }

  printEligibleSummary(preview.eligible);

  if (!apply) {
    console.log('\n--- Dry run only. To apply, pass explicit ids:');
    console.log(
      '  node scripts/backfill-missing-package-commissions.js --apply --ids=' +
        preview.eligible.map((e) => e.paymentId).join(',')
    );
    await mongoose.disconnect();
    return;
  }

  if (!ids || ids.length === 0) {
    console.error('\nRefusing --apply without --ids=... Copy ids from the preview output.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\nApplying for', ids.length, 'payment(s)...');
  const results = await svc.applyBackfillMissingPackageCommissions(ids);
  console.log(JSON.stringify(results, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
