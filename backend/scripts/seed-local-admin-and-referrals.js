/**
 * Seed local DB with:
 * - 1 admin (with referral code)
 * - 3 students referred by that admin (parentReferralCode = admin.referralCode)
 *
 * Usage (from backend/): node scripts/seed-local-admin-and-referrals.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

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

const ADMIN = {
  email: 'localadmin@forexnavigators.com',
  password: 'Admin123!',
  firstName: 'Local',
  lastName: 'Admin',
  role: 'admin',
  isVerified: true,
  isActive: true
};

const STUDENTS = [
  {
    email: 'student1@forexnavigators.com',
    password: 'Student123!',
    firstName: 'Student',
    lastName: 'One'
  },
  {
    email: 'student2@forexnavigators.com',
    password: 'Student123!',
    firstName: 'Student',
    lastName: 'Two'
  },
  {
    email: 'student3@forexnavigators.com',
    password: 'Student123!',
    firstName: 'Student',
    lastName: 'Three'
  }
];

async function removeIfExists(emails) {
  await User.deleteMany({ email: { $in: emails.map((e) => e.toLowerCase()) } });
}

async function ensureReferralCode(user) {
  if (user.referralCode && String(user.referralCode).trim()) return user.referralCode;
  const referralService = require('../services/referralService');
  await referralService.generateReferralCode(user);
  const fresh = await User.findById(user._id).select('referralCode').lean();
  return fresh?.referralCode;
}

async function main() {
  const mongoUri = getMongoUri();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected. DB:', mongoose.connection.db?.databaseName);

  const allEmails = [ADMIN.email, ...STUDENTS.map((s) => s.email)];
  console.log('Removing any existing seed users...');
  await removeIfExists(allEmails);

  console.log('Creating admin...');
  const admin = await User.create({
    email: ADMIN.email.toLowerCase(),
    password: ADMIN.password,
    firstName: ADMIN.firstName,
    lastName: ADMIN.lastName,
    role: 'admin',
    isVerified: true,
    isActive: true,
    country: 'Pakistan'
  });

  const adminReferralCode = await ensureReferralCode(admin);
  if (!adminReferralCode) {
    throw new Error('Failed to generate admin referral code');
  }
  console.log('✅ Admin referral code:', adminReferralCode);

  console.log('Creating students referred by admin...');
  for (const s of STUDENTS) {
    const student = await User.create({
      email: s.email.toLowerCase(),
      password: s.password,
      firstName: s.firstName,
      lastName: s.lastName,
      role: 'student',
      isVerified: true,
      isActive: true,
      country: 'Pakistan',
      parentReferralCode: adminReferralCode,
      referredByDefaultCode: false
    });
    await ensureReferralCode(student);
    console.log(`  ✓ ${s.email} (parentReferralCode=${adminReferralCode})`);
  }

  console.log('\n--- Seeded credentials ---');
  console.log(`ADMIN:   ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`STUDENT: ${STUDENTS[0].email} / ${STUDENTS[0].password}`);
  console.log(`STUDENT: ${STUDENTS[1].email} / ${STUDENTS[1].password}`);
  console.log(`STUDENT: ${STUDENTS[2].email} / ${STUDENTS[2].password}`);
  console.log('\nDone.');
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

