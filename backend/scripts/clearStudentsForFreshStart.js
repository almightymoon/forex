/**
 * Clear all student/instructor users and their data. Keeps admin, teacher, and default data.
 * Use this to start fresh with registrations.
 *
 * KEEPS: Admin users, teacher users, Settings, Courses (content), PromoCodes, CertificateTemplates.
 * REMOVES: All students/instructors; all payments; all commission records (BalanceTransaction
 *   type referral_commission) and ReferralCommission; progress, certificates, referrals, etc.
 *   Resets admin/teacher balance and referral stats to 0 so commission analytics start fresh.
 *
 * Usage: node scripts/clearStudentsForFreshStart.js
 * Ensure .env has MONGODB_URI (or MONGO_URI) set. Consider backing up the DB first.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Payment = require('../models/Payment');
const CourseProgress = require('../models/CourseProgress');
const Notification = require('../models/Notification');
const NotificationTracking = require('../models/NotificationTracking');
const BalanceTransaction = require('../models/BalanceTransaction');
const MT5Account = require('../models/MT5Account');
const MT5Trade = require('../models/MT5Trade');
const Trade = require('../models/Trade');
const Withdrawal = require('../models/Withdrawal');
const ReferralCommission = require('../models/ReferralCommission');
const Referral = require('../models/Referral');
const Certificate = require('../models/Certificate');
const StudentCertificateAssignment = require('../models/StudentCertificateAssignment');
const Course = require('../models/Course');
const LiveSession = require('../models/LiveSession');
const Assignment = require('../models/Assignment');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const TeacherMessage = require('../models/TeacherMessage');
const TradingSignal = require('../models/TradingSignal');
const PromoCode = require('../models/PromoCode');

function getMongoUri() {
  let uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/forex-lms';
  const dbName = process.env.DB_NAME;
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

async function run() {
  const mongoUri = getMongoUri();
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB (db: ' + (mongoose.connection.db?.databaseName || process.env.DB_NAME || 'default') + ')');

  const studentIds = await User.find({ role: { $in: ['student', 'instructor'] } }).distinct('_id');
  const count = studentIds.length;
  if (count === 0) {
    console.log('No student/instructor users to remove.');
    await mongoose.disconnect();
    return;
  }
  console.log(`Found ${count} student/instructor user(s) to remove.`);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const del = (model, filter, label) => {
      return model.deleteMany(filter, { session }).then((r) => {
        if (r.deletedCount > 0) console.log(`  ${label}: deleted ${r.deletedCount}`);
        return r;
      });
    };

    const studentIdList = studentIds.map((id) => id);

    await del(Payment, { user: { $in: studentIdList } }, 'Payment');
    await del(CourseProgress, { student: { $in: studentIdList } }, 'CourseProgress');
    await del(Notification, { userId: { $in: studentIdList } }, 'Notification');
    await del(NotificationTracking, { userId: { $in: studentIdList } }, 'NotificationTracking');
    await del(BalanceTransaction, { user: { $in: studentIdList } }, 'BalanceTransaction (student)');
    await del(BalanceTransaction, { type: 'referral_commission' }, 'BalanceTransaction (all commissions)');
    await del(MT5Account, { user: { $in: studentIdList } }, 'MT5Account');
    await del(MT5Trade, { user: { $in: studentIdList } }, 'MT5Trade');
    await del(Trade, { user: { $in: studentIdList } }, 'Trade');
    await del(Withdrawal, { user: { $in: studentIdList } }, 'Withdrawal');
    await del(ReferralCommission, { $or: [{ referrer: { $in: studentIdList } }, { purchaser: { $in: studentIdList } }] }, 'ReferralCommission');
    await del(Referral, { $or: [{ user: { $in: studentIdList } }, { referrer: { $in: studentIdList } }] }, 'Referral');
    await del(Certificate, { student: { $in: studentIdList } }, 'Certificate');
    await del(StudentCertificateAssignment, { studentId: { $in: studentIdList } }, 'StudentCertificateAssignment');

    const r1 = await Message.deleteMany({ sender: { $in: studentIdList } }, { session });
    if (r1.deletedCount > 0) console.log(`  Message (sender): deleted ${r1.deletedCount}`);

    const r2a = await TradingSignal.updateMany(
      {},
      { $pull: { comments: { user: { $in: studentIdList } } } },
      { session }
    );
    const r2b = await TradingSignal.updateMany(
      {},
      { $pull: { likes: { $in: studentIdList } } },
      { session }
    );
    const r2 = { modifiedCount: (r2a.modifiedCount || 0) + (r2b.modifiedCount || 0) };
    if (r2.modifiedCount > 0) console.log(`  TradingSignal (comments/likes): modified ${r2.modifiedCount}`);

    const r3 = await PromoCode.updateMany(
      {},
      { $pull: { usageHistory: { user: { $in: studentIdList } } } },
      { session }
    );
    if (r3.modifiedCount > 0) console.log(`  PromoCode (usageHistory): modified ${r3.modifiedCount}`);

    const r4 = await TeacherMessage.updateMany(
      {},
      { $pull: { recipients: { studentId: { $in: studentIdList } } } },
      { session }
    );
    if (r4.modifiedCount > 0) console.log(`  TeacherMessage (recipients): modified ${r4.modifiedCount}`);

    for (const sid of studentIdList) {
      await Course.updateMany(
        { 'enrolledStudents.student': sid },
        { $pull: { enrolledStudents: { student: sid } }, $inc: { totalStudents: -1 } },
        { session }
      );
    }
    console.log('  Course: removed student enrollments');

    await LiveSession.updateMany(
      {},
      { $pull: { currentParticipants: { student: { $in: studentIdList } } } },
      { session }
    );
    console.log('  LiveSession: removed student participants');

    await Assignment.updateMany(
      {},
      { $pull: { submissions: { student: { $in: studentIdList } } } },
      { session }
    );
    console.log('  Assignment: removed student submissions');

    const channels = await Channel.find({ 'members.userId': { $in: studentIdList } }, { _id: 1 }, { session });
    for (const ch of channels) {
      ch.members = ch.members.filter((m) => !studentIdList.some((id) => id.equals(m.userId)));
      await ch.save({ session });
    }
    if (channels.length > 0) console.log(`  Channel: removed student members from ${channels.length} channel(s)`);

    const userResult = await User.deleteMany({ _id: { $in: studentIdList } }, { session });
    console.log(`  User: deleted ${userResult.deletedCount} student/instructor(s)`);

    await User.updateMany(
      { role: { $in: ['admin', 'teacher'] } },
      {
        $set: {
          balance: 0,
          'referralStats.totalReferrals': 0,
          'referralStats.totalEarnings': 0,
          'referralStats.level1Count': 0,
          'referralStats.level2Count': 0,
          'referralStats.level3Count': 0,
          'referralStats.level4Count': 0,
          'referralStats.level5Count': 0,
          'referralStats.verifiedReferrals': 0
        }
      },
      { session }
    );
    console.log('  User: reset balance and referral stats for admin/teacher');

    await session.commitTransaction();
    console.log('Done. Admin, teacher, and default data (Settings, Courses, PromoCodes, etc.) are unchanged.');
  } catch (err) {
    await session.abortTransaction();
    console.error('Error:', err);
    throw err;
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
