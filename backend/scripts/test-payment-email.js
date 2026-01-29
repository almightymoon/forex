require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

async function testPaymentEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/forex-lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find a test user (you can change this email)
    const testEmail = process.argv[2] || 'athar@example.com';
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.error(`❌ User with email ${testEmail} not found`);
      console.log('\nAvailable users:');
      const users = await User.find().select('email firstName lastName').limit(10);
      users.forEach(u => console.log(`  - ${u.email} (${u.firstName} ${u.lastName})`));
      process.exit(1);
    }

    console.log(`📧 Sending test payment pending email to: ${user.email}`);
    console.log(`   User: ${user.firstName} ${user.lastName}\n`);

    // Send the notification
    const result = await notificationService.sendNotificationToUser(user._id, 'payment_pending', {
      amount: 250,
      finalAmount: 250,
      currency: 'USD',
      packageName: 'FX Scale',
      paymentId: 'TEST12345',
      transactionId: 'TEST12345'
    });

    console.log('\n📊 Notification Result:');
    console.log('  Email sent:', result.email ? '✅ YES' : '❌ NO');
    console.log('  SMS sent:', result.sms ? '✅ YES' : '❌ NO');
    console.log('  Push sent:', result.push ? '✅ YES' : '❌ NO');

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPaymentEmail();
