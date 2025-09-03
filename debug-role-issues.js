const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function debugRoleIssues() {
  try {
    // Connect to MongoDB
    const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users and their roles
    const users = await User.find({}).select('email firstName lastName role isActive isVerified createdAt');
    
    console.log('\n=== USER ROLES DEBUG ===');
    console.log(`Total users: ${users.length}`);
    
    const roleCounts = {};
    const adminUsers = [];
    const studentUsers = [];
    const teacherUsers = [];
    
    users.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      
      if (user.role === 'admin') {
        adminUsers.push(user);
      } else if (user.role === 'student') {
        studentUsers.push(user);
      } else if (user.role === 'teacher') {
        teacherUsers.push(user);
      }
    });
    
    console.log('\nRole distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} users`);
    });
    
    console.log('\n=== ADMIN USERS ===');
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive}, Verified: ${user.isVerified}`);
    });
    
    console.log('\n=== STUDENT USERS (first 10) ===');
    studentUsers.slice(0, 10).forEach(user => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive}, Verified: ${user.isVerified}`);
    });
    
    console.log('\n=== TEACHER USERS ===');
    teacherUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive}, Verified: ${user.isVerified}`);
    });
    
    // Check for users with missing roles
    const usersWithMissingRoles = users.filter(user => !user.role);
    if (usersWithMissingRoles.length > 0) {
      console.log('\n=== USERS WITH MISSING ROLES ===');
      usersWithMissingRoles.forEach(user => {
        console.log(`  - ${user.email} (${user.firstName} ${user.lastName})`);
      });
      
      // Fix missing roles
      console.log('\nFixing users with missing roles...');
      for (const user of usersWithMissingRoles) {
        user.role = 'student'; // Default to student
        await user.save();
        console.log(`  Fixed: ${user.email} -> student`);
      }
    }
    
    // Check for users with invalid roles
    const validRoles = ['admin', 'teacher', 'student'];
    const usersWithInvalidRoles = users.filter(user => user.role && !validRoles.includes(user.role));
    if (usersWithInvalidRoles.length > 0) {
      console.log('\n=== USERS WITH INVALID ROLES ===');
      usersWithInvalidRoles.forEach(user => {
        console.log(`  - ${user.email}: ${user.role}`);
      });
      
      // Fix invalid roles
      console.log('\nFixing users with invalid roles...');
      for (const user of usersWithInvalidRoles) {
        user.role = 'student'; // Default to student
        await user.save();
        console.log(`  Fixed: ${user.email} -> student`);
      }
    }
    
    // Verify admin user exists
    const adminUser = await User.findOne({ email: 'admin@forexnavi.com' });
    if (!adminUser) {
      console.log('\n=== CREATING ADMIN USER ===');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newAdmin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@forexnavi.com',
        password: hashedPassword,
        phone: '+1234567890',
        country: 'US',
        role: 'admin',
        isActive: true,
        isVerified: true,
        subscription: {
          plan: 'premium',
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      
      await newAdmin.save();
      console.log('  Created admin user: admin@forexnavi.com / admin123');
    } else {
      console.log('\n=== ADMIN USER VERIFICATION ===');
      console.log(`  Admin user exists: ${adminUser.email}`);
      console.log(`  Role: ${adminUser.role}`);
      console.log(`  Active: ${adminUser.isActive}`);
      console.log(`  Verified: ${adminUser.isVerified}`);
      
      // Ensure admin user has correct role
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('  Fixed admin user role');
      }
    }
    
    console.log('\n=== ROLE DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Error debugging roles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

debugRoleIssues();
