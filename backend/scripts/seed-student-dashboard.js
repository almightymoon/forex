/**
 * Seed demo trading signals, assignments, live sessions, certificates, and rank rewards.
 *
 * Usage (from backend/): node scripts/seed-student-dashboard.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { ensureStudentDashboardDefaults } = require('../services/studentDashboardSeed');

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

  const result = await ensureStudentDashboardDefaults();

  console.log('\nStudent dashboard demo data ready\n');
  console.log(`Teacher: ${result.teacher.email}`);
  console.log(`Course:  ${result.course.title}`);
  console.log(`Signals: ${result.signals.length}`);
  result.signals.forEach((s) => console.log(`  • ${s.symbol} ${s.type} @ ${s.entryPrice}`));
  console.log(`Assignments: ${result.assignments.length}`);
  result.assignments.forEach((a) => console.log(`  • ${a.title}`));
  console.log(`Live sessions: ${result.sessions.length}`);
  result.sessions.forEach((s) => console.log(`  • ${s.title} [${s.status}]`));
  console.log(`Certificates: ${result.certificates.length}`);
  result.certificates.forEach((c) => console.log(`  • ${c.certificateId} (${c.studentName})`));
  console.log(`Rank rules: ${result.rankRules.length}`);
  result.rankRules.forEach((r) => console.log(`  • ${r.name} @ $${r.thresholdBalance}`));
  console.log('\nLog in as student1@forexnavigators.com / Student123!\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
