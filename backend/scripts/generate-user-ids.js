/**
 * Migration script to generate userId for existing users who don't have one
 * Run this script once to backfill userId for all existing users
 * 
 * Usage: node scripts/generate-user-ids.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function generateUserIds() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users without userId
    const usersWithoutId = await User.find({ 
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: '' }
      ]
    });

    console.log(`Found ${usersWithoutId.length} users without userId`);

    if (usersWithoutId.length === 0) {
      console.log('✅ All users already have userId');
      await mongoose.disconnect();
      return;
    }

    // Generate userId for each user
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutId) {
      try {
        // Generate unique userId
        const userId = await User.generateUserId();
        user.userId = userId;
        await user.save();
        console.log(`✅ Generated userId ${userId} for user ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error generating userId for user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully generated userIds: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
generateUserIds();
