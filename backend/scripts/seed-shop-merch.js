/**
 * Seed shop merchandise categories and test products (tee, mug, hoodie, cap, tote).
 *
 * Usage (from backend/): node scripts/seed-shop-merch.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { ensureShopMerchDefaults, MERCH_PRODUCTS } = require('../services/shopMerchSeed');
const Product = require('../models/Product');

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

async function main() {
  const mongoUri = getMongoUri();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected. DB:', mongoose.connection.db?.databaseName);

  await ensureShopMerchDefaults();

  const ids = MERCH_PRODUCTS.map((p) => p.productId);
  const created = await Product.find({ productId: { $in: ids } })
    .select('productId name status price category')
    .lean();

  console.log('\nShop merchandise ready:');
  created.forEach((p) => {
    console.log(`  • ${p.name} (${p.productId}) — $${p.price} [${p.status}]`);
  });
  console.log('\nView at: /shop (after restarting backend if it was already running)\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
