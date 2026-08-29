const TradingSignal = require('../models/TradingSignal');
const Assignment = require('../models/Assignment');
const LiveSession = require('../models/LiveSession');
const Certificate = require('../models/Certificate');
const RankRewardRule = require('../models/RankRewardRule');
const RankRewardUnlock = require('../models/RankRewardUnlock');
const Course = require('../models/Course');
const User = require('../models/User');
const { ensureCourseDefaults, TEACHER_SEED, ENROLLED_STUDENT_EMAILS } = require('./courseSeed');

const DAYS = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const SEED_SIGNALS = [
  {
    seedKey: 'seed:sig-eur',
    symbol: 'EURUSD',
    instrumentType: 'forex',
    type: 'buy',
    entryPrice: 1.085,
    targetPrice: 1.095,
    targets: [1.09, 1.095, 1.1],
    stopLoss: 1.078,
    timeframe: '1h',
    confidence: 72,
    riskLevel: 'medium',
    marketConditions: 'bullish',
    description: 'Demo long: bounce off London session support with bullish structure.',
    status: 'active',
    isPublished: true,
    currentBid: 1.0848,
    currentAsk: 1.085,
    dailyHigh: 1.0872,
    dailyLow: 1.0815,
    priceChange: 0.0012,
    priceChangePercent: 0.11,
  },
  {
    seedKey: 'seed:sig-xau',
    symbol: 'XAUUSD',
    instrumentType: 'commodities',
    type: 'sell',
    entryPrice: 2345,
    targetPrice: 2310,
    targets: [2325, 2310],
    stopLoss: 2362,
    timeframe: '4h',
    confidence: 68,
    riskLevel: 'high',
    marketConditions: 'bearish',
    description: 'Demo short: rejection at prior high — trail if TP1 hits.',
    status: 'active',
    isPublished: true,
    currentBid: 2344.2,
    currentAsk: 2344.8,
    dailyHigh: 2358,
    dailyLow: 2331,
    priceChange: -6.4,
    priceChangePercent: -0.27,
  },
  {
    seedKey: 'seed:sig-btc',
    symbol: 'BTCUSD',
    instrumentType: 'crypto',
    type: 'buy',
    entryPrice: 64200,
    targetPrice: 66800,
    stopLoss: 62800,
    timeframe: '1d',
    confidence: 60,
    riskLevel: 'medium',
    marketConditions: 'sideways',
    description: 'Demo swing: range breakout watch — for catalog testing only.',
    status: 'active',
    isPublished: true,
    currentBid: 64150,
    currentAsk: 64210,
  },
];

const SEED_ASSIGNMENTS = [
  {
    seedKey: 'seed:asg-chart',
    title: '[Demo] Mark support & resistance',
    description: 'On EURUSD H1, mark 2 support and 2 resistance levels from the last 5 sessions. Explain why each level matters.',
    assignmentType: 'analysis',
    maxPoints: 100,
    passingScore: 60,
    instructions: 'Submit a short write-up (or screenshot notes). Focus on session highs/lows and clean reaction zones.',
    daysUntilDue: 10,
  },
  {
    seedKey: 'seed:asg-risk',
    title: '[Demo] Position size worksheet',
    description: 'Calculate lot size for a $1,000 account risking 1% with a 25-pip stop on EURUSD.',
    assignmentType: 'project',
    maxPoints: 50,
    passingScore: 35,
    instructions: 'Show your formula and final lot size. Round to 2 decimals.',
    daysUntilDue: 14,
  },
];

const SEED_SESSIONS = [
  {
    seedKey: 'seed:ls-london',
    title: 'London Open Live (Demo)',
    description: 'Watch the London open together — structure, liquidity grabs, and entry filters. Demo session for testing bookings.',
    duration: 60,
    daysAhead: 2,
    category: 'forex',
    level: 'beginner',
    status: 'scheduled',
    isFree: true,
    meetingLink: 'https://meet.google.com/demo-london-open',
    topics: ['Sessions', 'Liquidity', 'Risk'],
  },
  {
    seedKey: 'seed:ls-ny',
    title: 'NY Overlap Q&A (Demo)',
    description: 'Live Q&A during the London/NY overlap. Bring charts and questions.',
    duration: 45,
    daysAhead: 5,
    category: 'qa',
    level: 'all',
    status: 'scheduled',
    isFree: true,
    meetingLink: 'https://meet.google.com/demo-ny-qa',
    topics: ['Q&A', 'Price action'],
  },
  {
    seedKey: 'seed:ls-replay',
    title: 'Weekend Replay Review (Demo)',
    description: 'Completed demo session with replay — for testing past sessions UI.',
    duration: 90,
    daysAhead: -3,
    category: 'forex',
    level: 'intermediate',
    status: 'completed',
    isFree: true,
    recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    isReplayAvailable: true,
    topics: ['Review', 'Journaling'],
  },
];

const SEED_RANK_RULES = [
  {
    seedKey: 'seed:rr-bronze',
    name: 'Bronze Navigator',
    thresholdBalance: 100,
    rewardDescription: 'Welcome kit + community badge (demo reward).',
    rewardValue: 'Starter kit',
    sortOrder: 1,
  },
  {
    seedKey: 'seed:rr-silver',
    name: 'Silver Navigator',
    thresholdBalance: 500,
    rewardDescription: 'Branded merch credit and priority Q&A slot (demo).',
    rewardValue: '$50 merch credit',
    sortOrder: 2,
  },
  {
    seedKey: 'seed:rr-gold',
    name: 'Gold Navigator',
    thresholdBalance: 2000,
    rewardDescription: '1:1 mentoring call + Gold badge (demo).',
    rewardValue: 'Mentoring call',
    sortOrder: 3,
  },
];

async function ensureTeacher() {
  let teacher = await User.findOne({ email: TEACHER_SEED.email.toLowerCase() });
  if (!teacher) {
    await ensureCourseDefaults();
    teacher = await User.findOne({ email: TEACHER_SEED.email.toLowerCase() });
  }
  if (!teacher) {
    teacher = new User(TEACHER_SEED);
    await teacher.save();
  }
  return teacher;
}

async function upsertSignals(teacherId) {
  const out = [];
  for (const def of SEED_SIGNALS) {
    let doc = await TradingSignal.findOne({ tags: def.seedKey });
    const payload = {
      ...def,
      teacher: teacherId,
      tags: [def.seedKey, 'demo'],
      isPublished: true,
    };
    delete payload.seedKey;
    if (doc) {
      doc.set(payload);
      await doc.save();
    } else {
      doc = await TradingSignal.create(payload);
    }
    out.push(doc);
  }
  return out;
}

async function upsertAssignments(teacherId, courseId) {
  const out = [];
  for (const def of SEED_ASSIGNMENTS) {
    let doc = await Assignment.findOne({ title: def.title, course: courseId });
    const payload = {
      title: def.title,
      description: def.description,
      course: courseId,
      teacher: teacherId,
      dueDate: DAYS(def.daysUntilDue),
      maxPoints: def.maxPoints,
      passingScore: def.passingScore,
      assignmentType: def.assignmentType,
      instructions: def.instructions,
      isPublished: true,
      allowLateSubmission: true,
      latePenalty: 10,
    };
    if (doc) {
      // Avoid dueDate validation failing if somehow past — always push forward on reseed
      doc.set(payload);
      await doc.save();
    } else {
      doc = await Assignment.create(payload);
    }
    out.push(doc);
  }
  return out;
}

async function upsertSessions(teacherId, students) {
  const out = [];
  for (const def of SEED_SESSIONS) {
    let doc = await LiveSession.findOne({ tags: def.seedKey });
    const scheduledAt = DAYS(def.daysAhead);
    const payload = {
      title: def.title,
      description: def.description,
      teacher: teacherId,
      scheduledAt,
      duration: def.duration,
      category: def.category,
      level: def.level,
      status: def.status,
      isFree: def.isFree,
      meetingLink: def.meetingLink || '',
      recordingUrl: def.recordingUrl || '',
      isReplayAvailable: def.isReplayAvailable ?? true,
      topics: def.topics || [],
      tags: [def.seedKey, 'demo'],
      allowedPackages: null,
      maxParticipants: 100,
    };

    if (doc) {
      doc.set(payload);
    } else {
      doc = new LiveSession(payload);
    }

    // Book first student into upcoming sessions
    if (def.status === 'scheduled' && students[0]) {
      const sid = String(students[0]._id);
      const already = (doc.currentParticipants || []).some((p) => String(p.student) === sid);
      if (!already) {
        doc.currentParticipants = doc.currentParticipants || [];
        doc.currentParticipants.push({
          student: students[0]._id,
          bookedAt: new Date(),
          attended: false,
        });
      }
    }

    await doc.save();
    out.push(doc);
  }
  return out;
}

async function upsertCertificates(students, course, teacher) {
  const out = [];
  const student = students.find((s) => s.email === 'student1@forexnavigators.com') || students[0];
  if (!student || !course) return out;

  const instructorName = `${teacher.firstName || 'Demo'} ${teacher.lastName || 'Instructor'}`.trim();
  const specs = [
    {
      certificateId: 'CERT-DEMO-FX-FOUND-01',
      completionPercentage: 100,
    },
    {
      certificateId: 'CERT-DEMO-FX-FOUND-PARTIAL',
      completionPercentage: 85,
      studentEmail: 'student2@forexnavigators.com',
    },
  ];

  for (const spec of specs) {
    const target =
      (spec.studentEmail && students.find((s) => s.email === spec.studentEmail)) || student;
    let doc = await Certificate.findOne({ certificateId: spec.certificateId });
    const payload = {
      student: target._id,
      course: course._id,
      certificateId: spec.certificateId,
      completionPercentage: spec.completionPercentage,
      studentName: `${target.firstName || 'Student'} ${target.lastName || ''}`.trim(),
      courseTitle: course.title,
      instructorName,
      certificateUrl: '/shop/fx-navigators-logo-imprint.png',
      isVerified: true,
      issuedBy: 'Forex Navigators (Demo)',
      completionDate: new Date(),
    };
    if (doc) {
      doc.set(payload);
      await doc.save();
    } else {
      doc = await Certificate.create(payload);
    }
    out.push(doc);
  }
  return out;
}

async function upsertRankRewards(students) {
  const rules = [];
  for (const def of SEED_RANK_RULES) {
    let rule = await RankRewardRule.findOne({ name: def.name });
    const payload = {
      name: def.name,
      thresholdBalance: def.thresholdBalance,
      rewardDescription: def.rewardDescription,
      rewardValue: def.rewardValue,
      isActive: true,
      sortOrder: def.sortOrder,
      imageUrl: '/shop/fx-navigators-logo-imprint.png',
    };
    if (rule) {
      rule.set(payload);
      await rule.save();
    } else {
      rule = await RankRewardRule.create(payload);
    }
    rules.push(rule);
  }

  // Unlock bronze for student1 so progress UI has something unlocked
  const student = students.find((s) => s.email === 'student1@forexnavigators.com') || students[0];
  const bronze = rules[0];
  if (student && bronze) {
    const existing = await RankRewardUnlock.findOne({ user: student._id, rule: bronze._id });
    if (!existing) {
      await RankRewardUnlock.create({
        user: student._id,
        rule: bronze._id,
        thresholdBalance: bronze.thresholdBalance,
        balanceAtUnlock: bronze.thresholdBalance + 50,
        status: 'unlocked',
        unlockedAt: new Date(),
      });
    }
  }

  return rules;
}

/**
 * Idempotent seed for student dashboard demo data:
 * signals, assignments, live sessions, certificates, rank rewards.
 */
async function ensureStudentDashboardDefaults() {
  await ensureCourseDefaults();

  const teacher = await ensureTeacher();
  const students = await User.find({
    email: { $in: ENROLLED_STUDENT_EMAILS.map((e) => e.toLowerCase()) },
  });

  const course =
    (await Course.findOne({ tags: 'seed:fx-found' })) ||
    (await Course.findOne({ isPublished: true }).sort({ createdAt: 1 }));

  if (!course) {
    throw new Error('No published course found — run course seed first');
  }

  const signals = await upsertSignals(teacher._id);
  const assignments = await upsertAssignments(teacher._id, course._id);
  const sessions = await upsertSessions(teacher._id, students);
  const certificates = await upsertCertificates(students, course, teacher);
  const rankRules = await upsertRankRewards(students);

  return {
    teacher,
    students,
    course,
    signals,
    assignments,
    sessions,
    certificates,
    rankRules,
  };
}

module.exports = {
  ensureStudentDashboardDefaults,
  SEED_SIGNALS,
  SEED_ASSIGNMENTS,
  SEED_SESSIONS,
  SEED_RANK_RULES,
};
