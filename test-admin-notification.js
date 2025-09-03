const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

async function createTestNotification() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@forexnavi.com' });
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    // Create test notification for admin
    const testNotification = new Notification({
      userId: adminUser._id,
      type: 'system',
      title: 'Admin Dashboard Test',
      message: 'This is a test notification for the admin dashboard. The notification system is working!',
      data: {
        action: 'test',
        timestamp: new Date()
      },
      priority: 'medium',
      read: false
    });

    await testNotification.save();
    console.log('Test notification created successfully!');
    console.log('Notification details:');
    console.log('- Title:', testNotification.title);
    console.log('- Message:', testNotification.message);
    console.log('- Type:', testNotification.type);
    console.log('- Priority:', testNotification.priority);
    console.log('- User:', adminUser.email);

    // Check unread count
    const unreadCount = await Notification.countDocuments({
      userId: adminUser._id,
      read: false
    });
    console.log('- Unread notifications:', unreadCount);

    console.log('\n=== TEST NOTIFICATION CREATED ===');
    console.log('Login to admin dashboard to see the notification!');
    
  } catch (error) {
    console.error('Error creating test notification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createTestNotification();
