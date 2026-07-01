/**
 * Seed a sample shop-style promo campaign.
 * Usage (from backend/): node scripts/seed-app-campaign.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const AppCampaign = require('../models/AppCampaign');

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
  await mongoose.connect(getMongoUri());
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);

  await AppCampaign.updateOne(
    { campaignId: 'welcome-shop-sale' },
    {
      $set: {
        campaignId: 'welcome-shop-sale',
        name: 'Welcome shop discount',
        status: 'published',
        title: 'Limited time offer',
        body: 'Get exclusive FX Navigators merch and digital tools. Browse the shop and use USDT checkout.',
        badge: '20% OFF',
        imageUrl: '/shop/fx-logo-tee.png',
        cta: {
          label: 'Shop now',
          action: 'route',
          route: '/shop',
          url: '',
        },
        showDismissButton: true,
        dismissMode: 'campaign',
        startAt: start,
        endAt: end,
        platforms: ['mobile', 'web'],
        audience: 'authenticated',
        allowedPackages: null,
        frequency: 'once_per_session',
        priority: 10,
        version: 1,
        publishedAt: start,
      },
    },
    { upsert: true },
  );

  console.log('✅ Sample campaign seeded: welcome-shop-sale');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
