const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixIncorrectRoles() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Fix users that should be students but are marked as admin
    const usersToFix = [
      { email: 'testing123@gmail.com', correctRole: 'student' },
      { email: 'testing@gmail.com', correctRole: 'student' }
    ];

    console.log('\n=== FIXING INCORRECT ROLES ===');
    
    for (const userFix of usersToFix) {
      const user = await User.findOne({ email: userFix.email });
      if (user && user.role !== userFix.correctRole) {
        console.log(`Fixing ${user.email}: ${user.role} -> ${userFix.correctRole}`);
        user.role = userFix.correctRole;
        await user.save();
        console.log(`  ✓ Fixed: ${user.email} is now ${userFix.correctRole}`);
      } else if (user) {
        console.log(`  ✓ ${user.email} already has correct role: ${user.role}`);
      } else {
        console.log(`  ⚠ User not found: ${userFix.email}`);
      }
    }

    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const allUsers = await User.find({}).select('email firstName lastName role isActive isVerified');
    
    allUsers.forEach(user => {
      console.log(`  ${user.email}: ${user.role} (${user.isActive ? 'Active' : 'Inactive'}, ${user.isVerified ? 'Verified' : 'Unverified'})`);
    });

    console.log('\n=== ROLE FIX COMPLETE ===');
    
  } catch (error) {
    console.error('Error fixing roles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixIncorrectRoles();
