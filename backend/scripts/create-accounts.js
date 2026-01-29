/**
 * Create Admin, Teacher, and User Accounts
 * Usage: node scripts/create-accounts.js
 * 
 * This script creates:
 * - 1 Admin account
 * - 1 Teacher account
 * - 1 Student/User account
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Default account credentials
const accounts = [
  {
    email: 'admin@forexnavigators.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isVerified: true,
    isActive: true
  },
  {
    email: 'teacher@forexnavigators.com',
    password: 'teacher123',
    firstName: 'Teacher',
    lastName: 'User',
    role: 'teacher',
    isVerified: true,
    isActive: true
  },
  {
    email: 'student@forexnavigators.com',
    password: 'student123',
    firstName: 'Student',
    lastName: 'User',
    role: 'student',
    isVerified: false, // Students need to pay first
    isActive: true
  }
];

async function createAccounts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://moon:947131@cluster0.gvga3.mongodb.net/';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const results = {
      created: [],
      exists: [],
      errors: []
    };

    for (const accountData of accounts) {
      try {
        console.log(`\n📝 Creating ${accountData.role} account: ${accountData.email}`);

        // Check if user already exists
        const existingUser = await User.findOne({ email: accountData.email.toLowerCase() });

        if (existingUser) {
          console.log(`⚠️  User ${accountData.email} already exists`);
          results.exists.push({
            email: accountData.email,
            role: accountData.role,
            userId: existingUser._id
          });
          continue;
        }

        // Create new user
        const user = new User({
          email: accountData.email.toLowerCase(),
          password: accountData.password, // Will be hashed by pre-save hook
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          role: accountData.role,
          isVerified: accountData.isVerified,
          isActive: accountData.isActive,
          country: 'Pakistan'
        });

        await user.save();

        // Generate referral code for the user (if not admin)
        if (accountData.role !== 'admin') {
          try {
            const referralService = require('../services/referralService');
            await referralService.generateReferralCode(user);
            console.log(`   ✅ Referral code generated`);
          } catch (refError) {
            console.log(`   ⚠️  Could not generate referral code: ${refError.message}`);
          }
        }

        console.log(`✅ ${accountData.role} account created successfully!`);
        console.log(`   Email: ${accountData.email}`);
        console.log(`   Password: ${accountData.password}`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Verified: ${user.isVerified}`);
        console.log(`   Active: ${user.isActive}`);

        results.created.push({
          email: accountData.email,
          role: accountData.role,
          password: accountData.password,
          userId: user._id,
          isVerified: user.isVerified
        });

      } catch (error) {
        console.error(`❌ Error creating ${accountData.role} account:`, error.message);
        results.errors.push({
          email: accountData.email,
          role: accountData.role,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${results.created.length} account(s)`);
    console.log(`⚠️  Already exists: ${results.exists.length} account(s)`);
    console.log(`❌ Errors: ${results.errors.length} account(s)`);

    if (results.created.length > 0) {
      console.log('\n📋 Created Accounts:');
      results.created.forEach(acc => {
        console.log(`   - ${acc.role.toUpperCase()}: ${acc.email} / ${acc.password}`);
      });
    }

    if (results.exists.length > 0) {
      console.log('\n⚠️  Existing Accounts:');
      results.exists.forEach(acc => {
        console.log(`   - ${acc.role.toUpperCase()}: ${acc.email}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(acc => {
        console.log(`   - ${acc.role.toUpperCase()}: ${acc.email} - ${acc.error}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Script completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
createAccounts();
