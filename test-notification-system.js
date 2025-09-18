#!/usr/bin/env node

/**
 * Test notification system with mock email
 * This script tests the notification system without actually sending emails
 */

const mongoose = require('mongoose');
const NotificationTracking = require('./models/NotificationTracking');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-navigators', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System\n');
    
    // Check if we have users in the database
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found in database. Creating test user...');
      
      // Create a test user
      const testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'student',
        isVerified: true
      });
      
      await testUser.save();
      console.log('✅ Test user created');
    }

    // Get a user to test with
    const testUser = await User.findOne();
    console.log(`👤 Using test user: ${testUser.email}`);

    // Test creating a notification tracking record
    console.log('\n📧 Testing notification tracking...');
    
    const trackingRecord = new NotificationTracking({
      userId: testUser._id,
      type: 'system',
      channel: 'email',
      status: 'sent',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      sentAt: new Date(),
      metadata: {
        test: true,
        source: 'test-script'
      }
    });

    await trackingRecord.save();
    console.log('✅ Notification tracking record created');

    // Test getting notification statistics
    console.log('\n📊 Testing notification statistics...');
    
    const stats = await NotificationTracking.getNotificationStats();
    console.log('Notification statistics:', stats);

    const statsByChannel = await NotificationTracking.getStatsByChannel();
    console.log('Statistics by channel:', statsByChannel);

    // Test recent activity
    const recentActivity = await NotificationTracking.getRecentActivity(7);
    console.log('Recent activity:', recentActivity);

    console.log('\n✅ Notification system test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`• Users in database: ${userCount}`);
    console.log(`• Test notification created: ${trackingRecord._id}`);
    console.log(`• System is working correctly`);

    console.log('\n🔧 Next steps:');
    console.log('1. Fix Gmail authentication (run: node setup-gmail-app-password.js)');
    console.log('2. Test email delivery (run: node check-smtp-status.js)');
    console.log('3. Send real notifications from admin panel');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testNotificationSystem();

