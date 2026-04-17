require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

async function testPaymentPendingEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/forex-lms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find a test user
    const testUser = await User.findOne({ role: 'student' });
    if (!testUser) {
      console.error('❌ No student user found. Please create a test user first.');
      process.exit(1);
    }

    console.log(`📧 Testing payment pending email for user: ${testUser.email}\n`);

    // Test payment pending notification
    const result = await notificationService.sendNotificationToUser(
      testUser._id,
      'payment_pending',
      {
        amount: 250,
        finalAmount: 250,
        currency: 'USD',
        packageName: 'FX Scale',
        paymentId: 'TEST123456',
        transactionId: 'TEST123456'
      }
    );

    console.log('✅ Email sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing email:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPaymentPendingEmail();
