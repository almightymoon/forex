/**
 * Seed published demo courses for student Browse + My Courses testing.
 *
 * Usage (from backend/): node scripts/seed-courses.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const {
  ensureCourseDefaults,
  SEED_COURSES,
  ENROLLED_STUDENT_EMAILS,
  TEACHER_SEED,
} = require('../services/courseSeed');
const Course = require('../models/Course');

function getMongoUri() {
  let uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = (process.env.DB_NAME || '').trim();
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

async function main() {
  const mongoUri = getMongoUri();
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected. DB:', mongoose.connection.db?.databaseName);

  const { teacher, courses } = await ensureCourseDefaults();

  const published = await Course.find({
    tags: { $in: SEED_COURSES.map((c) => c.seedKey) },
    $or: [{ isPublished: true }, { status: 'published' }],
  })
    .select('title level totalStudents enrolledStudents')
    .lean();

  console.log(`\nCourses ready: ${published.length} published demo course(s)\n`);
  console.log(`Teacher: ${teacher.email} (password: ${TEACHER_SEED.password})`);
  published.forEach((c) => {
    console.log(`  • ${c.title} [${c.level}] — ${c.totalStudents || 0} enrolled`);
  });

  console.log('\nPre-enrolled students (My courses):');
  ENROLLED_STUDENT_EMAILS.forEach((email) => console.log(`  • ${email}`));
  console.log('\nStudent dashboard: /dashboard?tab=browse  |  /dashboard?tab=courses\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
