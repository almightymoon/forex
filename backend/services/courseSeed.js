const Course = require('../models/Course');
const User = require('../models/User');

const THUMBNAIL = '/shop/fx-navigators-logo-imprint.png';

const TEACHER_SEED = {
  email: 'teacher@forexnavigators.com',
  password: 'Teacher123!',
  firstName: 'Demo',
  lastName: 'Instructor',
  role: 'teacher',
  isVerified: true,
  isActive: true,
};

/** Students pre-enrolled in the first course (browse still shows all published). */
const ENROLLED_STUDENT_EMAILS = [
  'student1@forexnavigators.com',
  'student2@forexnavigators.com',
  'student3@forexnavigators.com',
];

const SEED_COURSES = [
  {
    seedKey: 'seed:fx-found',
    title: 'Forex Foundations (Demo)',
    description:
      'A hands-on starter course for new traders. Learn market structure, sessions, risk basics, and how to read a clean chart — perfect for testing Browse and My Courses.',
    category: 'forex',
    level: 'beginner',
    price: 0,
    currency: 'USD',
    language: 'English',
    tags: ['demo', 'beginner', 'forex'],
    isFeatured: true,
    preEnroll: true,
    learningOutcomes: [
      'Understand major forex sessions and liquidity',
      'Read support and resistance on a clean chart',
      'Size positions with a simple risk rule',
    ],
    requirements: ['No prior trading experience required'],
    content: [
      {
        title: 'Welcome & how this course works',
        description: 'What you will learn and how to track progress.',
        type: 'text',
        order: 1,
        isPreview: true,
        textContent:
          '<h2>Welcome aboard</h2><p>This is a <strong>demo course</strong> seeded for student testing. Use <em>Browse courses</em> to discover it and <em>My courses</em> after enrolling.</p><ul><li>Lesson 1 — Sessions</li><li>Lesson 2 — Risk basics</li><li>Lesson 3 — Chart drill</li></ul>',
      },
      {
        title: 'Forex sessions explained',
        description: 'London, New York, and overlap windows.',
        type: 'text',
        order: 2,
        textContent:
          '<p>The forex market runs 24/5. Focus your energy when liquidity is highest — typically the London open and the London/New York overlap.</p><p><strong>Tip:</strong> Mark session opens on your chart and watch how ranges expand.</p>',
      },
      {
        title: 'Risk per trade (1% rule)',
        description: 'Keep losses small while you learn.',
        type: 'text',
        order: 3,
        textContent:
          '<p>Risk a fixed percentage per trade (often 1%). If your account is $1,000, a 1% risk cap is $10. Your stop distance and lot size must respect that cap.</p>',
      },
    ],
  },
  {
    seedKey: 'seed:price-act',
    title: 'Price Action Patterns (Demo)',
    description:
      'Intermediate patterns — pin bars, engulfing candles, and break-and-retest setups. Enroll from Browse to add this to My Courses.',
    category: 'forex',
    level: 'intermediate',
    price: 0,
    currency: 'USD',
    language: 'English',
    tags: ['demo', 'price-action'],
    isFeatured: false,
    preEnroll: false,
    learningOutcomes: [
      'Spot high-quality pin bars at key levels',
      'Trade break-and-retest with a defined invalidation',
    ],
    requirements: ['Completed Forex Foundations or equivalent basics'],
    content: [
      {
        title: 'Pin bars at structure',
        description: 'Quality filters for rejection candles.',
        type: 'text',
        order: 1,
        isPreview: true,
        textContent:
          '<p>A pin bar shows rejection. Look for long wicks into prior support/resistance with the body closing back inside the range.</p>',
      },
      {
        title: 'Break and retest',
        description: 'Enter after confirmation, not on the first break.',
        type: 'text',
        order: 2,
        textContent:
          '<p>After a level breaks, wait for price to retest the broken zone as new support or resistance before committing risk.</p>',
      },
    ],
  },
  {
    seedKey: 'seed:psych',
    title: 'Trading Psychology (Demo)',
    description:
      'Mindset drills for consistency — journaling, tilt recovery, and pre-session routines. Another catalog item for Browse testing.',
    category: 'general',
    level: 'beginner',
    price: 0,
    currency: 'USD',
    language: 'English',
    tags: ['demo', 'psychology'],
    isFeatured: false,
    preEnroll: false,
    learningOutcomes: ['Build a repeatable pre-market routine', 'Recover after a losing streak without revenge trading'],
    requirements: [],
    content: [
      {
        title: 'Pre-session checklist',
        description: 'Five minutes before you touch a chart.',
        type: 'text',
        order: 1,
        isPreview: true,
        textContent:
          '<ol><li>Check economic calendar</li><li>Mark key levels</li><li>Define max daily loss</li><li>Set a timer for the session</li></ol>',
      },
    ],
  },
  {
    seedKey: 'seed:masterclass',
    title: 'Complete Forex Trader Masterclass (Demo)',
    description:
      'A full-length demo course for testing the learning experience — multiple lessons, embedded YouTube video, chart visuals, risk frameworks, and a structured path from market basics to your first trading plan. Ideal for Browse, course player, and progress tracking.',
    category: 'forex',
    level: 'intermediate',
    price: 0,
    currency: 'USD',
    language: 'English',
    tags: ['demo', 'masterclass', 'forex', 'video'],
    thumbnail: '/landing/laptop-trading.png',
    isFeatured: true,
    preEnroll: false,
    learningOutcomes: [
      'Explain how currency pairs are quoted and what moves price',
      'Identify the London and New York session windows on a chart',
      'Apply a fixed-percent risk model before every trade',
      'Recognize support, resistance, and a clean break-and-retest setup',
      'Build a one-page trading plan you can reuse daily',
    ],
    requirements: [
      'Basic computer literacy and a demo trading account (optional)',
      'Forex Foundations (Demo) recommended but not required',
    ],
    content: [
      {
        title: 'Welcome to the masterclass',
        description: 'How this course is structured and how to get the most from each lesson.',
        type: 'text',
        order: 1,
        isPreview: true,
        textContent:
          '<h2>Welcome, trader</h2><p>This is our <strong>flagship demo course</strong> — longer than the other catalog items so you can test scrolling, lesson navigation, video embeds, and image content in the course player.</p><h3>What is inside</h3><ul><li><strong>6 core lessons</strong> covering market structure, sessions, and risk</li><li><strong>1 embedded YouTube lesson</strong> on forex fundamentals</li><li><strong>1 visual lesson</strong> with a chart reference image</li><li>A capstone <strong>trading plan</strong> you fill in as you go</li></ul><p>Work through lessons in order the first time; you can revisit any section later from the curriculum sidebar.</p>',
      },
      {
        title: 'How the forex market works',
        description: 'Pairs, pips, lots, and why liquidity matters.',
        type: 'text',
        order: 2,
        textContent:
          '<h2>Currency pairs</h2><p>Forex is traded in <strong>pairs</strong> (e.g. EUR/USD). The first currency is the base; the second is the quote. If EUR/USD rises, the euro is strengthening versus the dollar.</p><h3>Pips and spread</h3><p>Most pairs quote to <strong>four decimal places</strong>; the fourth decimal is one pip. Your broker spread is the cost to enter — factor it into every setup.</p><h3>Lots and exposure</h3><p>A standard lot is 100,000 units of base currency. Mini (10k) and micro (1k) lots let you scale down while learning. <em>Never</em> size a trade without knowing the dollar risk at your stop.</p><h3>Why liquidity matters</h3><p>Major pairs during London and New York sessions typically have the tightest spreads and cleanest price action. Avoid illiquid windows unless you have a specific reason to be there.</p><blockquote>Rule of thumb: trade the session where your pair is naturally active — EUR/USD and GBP/USD during London; USD/JPY often respects Tokyo and New York flows.</blockquote>',
      },
      {
        title: 'Forex fundamentals (video)',
        description: 'Watch: introduction to how retail forex markets operate.',
        type: 'video',
        order: 3,
        isPreview: true,
        duration: 600,
        videoUrl: 'https://www.youtube.com/watch?v=EOn7ZDpKv_4',
        thumbnail: '/landing/laptop-trading.png',
        textContent:
          '<p>After watching, note three ideas you will apply in the next lesson: (1) what moves a pair, (2) how spread affects entries, (3) why session timing matters.</p>',
      },
      {
        title: 'Chart anatomy — support & resistance',
        description:
          'Visual reference for reading horizontal structure. Study how price reacts at prior highs and lows before moving on.',
        type: 'image',
        order: 4,
        imageUrl: '/landing/laptop-trading.png',
        textContent:
          '<p>Use the image as a reference for a clean workstation setup and chart layout. On your live chart, draw:</p><ol><li>Previous day high and low</li><li>Nearest swing high and swing low on your timeframe</li><li>One zone where price has reacted at least twice</li></ol><p>These levels become your map for the session — not every touch is a trade, but every trade should respect structure.</p>',
      },
      {
        title: 'Trading sessions & volatility windows',
        description: 'When to be at the desk and when to step away.',
        type: 'text',
        order: 5,
        textContent:
          '<h2>Session map (UTC)</h2><ul><li><strong>Asian (Tokyo):</strong> ~00:00–09:00 UTC — JPY pairs often most active</li><li><strong>London:</strong> ~07:00–16:00 UTC — EUR, GBP, CHF liquidity peaks</li><li><strong>New York:</strong> ~12:00–21:00 UTC — USD news and overlap with London</li></ul><h3>The overlap edge</h3><p>The <strong>London/New York overlap</strong> (roughly 12:00–16:00 UTC) is when many traders focus — volume expands and breakouts can follow through. That also means false breaks are punishing; wait for confirmation.</p><h3>Calendar discipline</h3><p>Mark high-impact news (CPI, NFP, central bank decisions) on an economic calendar. Reduce size or stand aside ±30 minutes around red-folder events until you have a tested plan for volatility.</p>',
      },
      {
        title: 'Risk management framework',
        description: 'Fixed fractional risk, daily loss cap, and position sizing.',
        type: 'text',
        order: 6,
        textContent:
          '<h2>The 1% rule</h2><p>Risk a <strong>fixed fraction</strong> of account equity per trade — commonly 0.5–1%. On a $5,000 account at 1%, max loss per trade is $50. Your stop distance and lot size must math to that cap.</p><h3>Daily loss limit</h3><p>Many professionals stop trading after <strong>2–3R lost</strong> in a day (where R = your planned risk per trade). Walk away, journal, return tomorrow.</p><h3>Position size checklist</h3><ol><li>Define entry, stop, and target before clicking buy/sell</li><li>Calculate pip distance to stop</li><li>Size lots so stop loss = your R dollar amount</li><li>Confirm reward-to-risk is at least 1:1.5 for discretionary setups</li></ol><p>Survival in forex is a math problem first and a prediction problem second.</p>',
      },
      {
        title: 'Break-and-retest setup walkthrough',
        description: 'A repeatable discretionary pattern with clear invalidation.',
        type: 'text',
        order: 7,
        textContent:
          '<h2>Setup definition</h2><ol><li>Identify a level that has held at least twice (support or resistance)</li><li>Wait for a <strong>decisive close</strong> beyond that level (break)</li><li>Do not chase — wait for price to return to the broken level (retest)</li><li>Enter on rejection at the retest; stop beyond the retest wick</li><li>Target prior structure or a fixed multiple of risk (e.g. 2R)</li></ol><h3>Invalidation</h3><p>If price closes back through the level against your bias, the idea is wrong — exit without hoping. Revenge trades after invalidation are the fastest path to blowing a demo account.</p><h3>Journal prompt</h3><p>Screenshot one break-and-retest on your chart this week. Label break, retest, stop, and target. Store it in your journal even if you did not take the trade.</p>',
      },
      {
        title: 'Build your one-page trading plan',
        description: 'Capstone — document your rules before the next live session.',
        type: 'text',
        order: 8,
        textContent:
          '<h2>Your trading plan template</h2><p>Copy this into your journal and complete every field before your next session.</p><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%"><tr><th>Section</th><th>Your answer</th></tr><tr><td>Markets</td><td>Which 1–2 pairs will you trade?</td></tr><tr><td>Sessions</td><td>Which hours (in your timezone) are you allowed to trade?</td></tr><tr><td>Setups</td><td>Which patterns are on your A-list? (e.g. break-and-retest)</td></tr><tr><td>Risk per trade</td><td>___% of account</td></tr><tr><td>Max daily loss</td><td>___R or ___%</td></tr><tr><td>News rule</td><td>Stand aside around high-impact events? Y/N</td></tr><tr><td>Pre-session routine</td><td>3 steps before opening charts</td></tr></table><h3>Graduation</h3><p>When this plan is filled in, you have completed the masterclass demo path. Continue to <strong>Price Action Patterns</strong> or enroll in live sessions from the student dashboard.</p><p><strong>Well done — consistency beats intensity.</strong></p>',
      },
    ],
  },
];

async function ensureSeedTeacher() {
  let teacher = await User.findOne({
    $or: [{ email: TEACHER_SEED.email.toLowerCase() }, { role: { $in: ['teacher', 'instructor'] } }],
  }).sort({ createdAt: 1 });

  if (!teacher) {
    teacher = new User(TEACHER_SEED);
    await teacher.save();
    console.log('[courseSeed] Created demo teacher:', teacher.email);
    return teacher;
  }

  if (teacher.role !== 'teacher' && teacher.role !== 'instructor') {
    teacher.role = 'teacher';
    await teacher.save();
  }

  return teacher;
}

async function upsertSeedCourse(definition, teacherId) {
  const existing = await Course.findOne({ tags: definition.seedKey });
  const payload = {
    title: definition.title,
    description: definition.description,
    teacher: teacherId,
    price: definition.price,
    currency: definition.currency,
    thumbnail: definition.thumbnail || THUMBNAIL,
    category: definition.category,
    level: definition.level,
    tags: [...(definition.tags || []), definition.seedKey],
    language: definition.language,
    requirements: definition.requirements || [],
    learningOutcomes: definition.learningOutcomes || [],
    content: definition.content,
    isPublished: true,
    status: 'published',
    isFeatured: Boolean(definition.isFeatured),
    allowedPackages: null,
  };

  let course;
  if (existing) {
    existing.set(payload);
    course = await existing.save();
  } else {
    course = await Course.create(payload);
  }

  return { course, preEnroll: definition.preEnroll };
}

async function enrollStudentInCourse(course, student) {
  const studentId = student._id;
  const alreadyOnCourse = course.enrolledStudents.some(
    (row) => String(row.student) === String(studentId)
  );

  if (!alreadyOnCourse) {
    await course.enrollStudent(studentId);
    await course.save();
  }

  const onUser =
    Array.isArray(student.enrolledCourses) &&
    student.enrolledCourses.some((row) => String(row.courseId) === String(course._id));

  if (!onUser) {
    student.enrolledCourses = student.enrolledCourses || [];
    student.enrolledCourses.push({
      courseId: course._id,
      enrolledAt: new Date(),
      progress: 0,
      completedLessons: 0,
      totalLessons: course.content?.length || 0,
      lastAccessed: new Date(),
    });
    await student.save();
  }
}

/**
 * Idempotent seed for demo courses (browse catalog + optional pre-enrollment).
 */
async function ensureCourseDefaults() {
  const teacher = await ensureSeedTeacher();
  const results = [];

  for (const definition of SEED_COURSES) {
    const { course, preEnroll } = await upsertSeedCourse(definition, teacher._id);
    results.push(course);

    if (preEnroll) {
      const students = await User.find({
        email: { $in: ENROLLED_STUDENT_EMAILS.map((e) => e.toLowerCase()) },
        isActive: { $ne: false },
      });

      for (const student of students) {
        await enrollStudentInCourse(course, student);
      }
    }
  }

  return { teacher, courses: results };
}

module.exports = {
  ensureCourseDefaults,
  SEED_COURSES,
  ENROLLED_STUDENT_EMAILS,
  TEACHER_SEED,
};
