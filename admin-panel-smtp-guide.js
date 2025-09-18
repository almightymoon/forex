#!/usr/bin/env node

/**
 * Admin Panel SMTP Update Guide
 * Instructions for updating SMTP settings through the admin interface
 */

console.log('🎯 Admin Panel SMTP Update Guide\n');

console.log('📋 Step-by-Step Instructions:');
console.log('1. Open your admin dashboard: http://localhost:3000/admin');
console.log('2. Navigate to "Settings" tab');
console.log('3. Scroll down to "Email Configuration" section');
console.log('4. Update the following fields:');
console.log('   • SMTP Host: smtp.gmail.com');
console.log('   • SMTP Port: 587');
console.log('   • SMTP Username: atharqulimoon@gmail.com');
console.log('   • SMTP Password: [YOUR_GMAIL_APP_PASSWORD]');
console.log('   • From Email: noreply@forexnavigators.com');
console.log('   • From Name: Forex Navigators');
console.log('5. Click "Save Settings"');
console.log('6. Click "Test Email Configuration" to verify');

console.log('\n🔑 Getting Gmail App Password:');
console.log('1. Go to: https://myaccount.google.com/security');
console.log('2. Sign in with: atharqulimoon@gmail.com');
console.log('3. Enable 2-Step Verification (if not already enabled)');
console.log('4. Go to "App passwords" section');
console.log('5. Select "Mail" and generate a password');
console.log('6. Copy the 16-character password (e.g., "abcd efgh ijkl mnop")');
console.log('7. Remove spaces: "abcdefghijklmnop"');
console.log('8. Use this password in the SMTP Password field');

console.log('\n⚠️  Important Notes:');
console.log('• Use the App Password, NOT your regular Gmail password');
console.log('• The App Password is different from your login password');
console.log('• It will look like: "abcd efgh ijkl mnop" (remove spaces)');
console.log('• You MUST have 2-Step Verification enabled first');

console.log('\n🧪 After updating, test with:');
console.log('node check-smtp-status.js');

console.log('\n📧 Alternative: Use Outlook');
console.log('If Gmail is too complicated:');
console.log('1. Create free Outlook account at https://outlook.com');
console.log('2. Use these settings:');
console.log('   • SMTP Host: smtp-mail.outlook.com');
console.log('   • SMTP Port: 587');
console.log('   • SMTP Username: your-outlook-email@outlook.com');
console.log('   • SMTP Password: your-outlook-password');

console.log('\n✅ Expected Results:');
console.log('• Email configuration test should pass');
console.log('• Notifications will show "1/1 delivered"');
console.log('• You will receive actual emails');
console.log('• Target audience will show correct user count');

