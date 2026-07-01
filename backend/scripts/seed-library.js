/**
 * Seed library categories and test resources.
 *
 * Usage (from backend/): node scripts/seed-library.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { ensureLibraryDefaults, LIBRARY_ITEMS } = require('../services/librarySeed');
const LibraryItem = require('../models/LibraryItem');

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

  await ensureLibraryDefaults();

  const ids = LIBRARY_ITEMS.map((i) => i.itemId);
  const items = await LibraryItem.find({ itemId: { $in: ids } })
    .select('itemId title status resourceType allowedPackages category')
    .sort({ sortOrder: 1 })
    .lean();

  const published = items.filter((i) => i.status === 'published');

  console.log(`\nLibrary ready: ${published.length} published / ${items.length} total seeded items\n`);
  published.forEach((i) => {
    const pkg =
      i.allowedPackages == null || (Array.isArray(i.allowedPackages) && i.allowedPackages.length === 0)
        ? 'all packages'
        : `$${i.allowedPackages.join(', $')}`;
    console.log(`  • [${i.resourceType}] ${i.title} (${i.itemId}) — ${pkg}`);
  });
  console.log('\nView at: /dashboard?tab=library\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
