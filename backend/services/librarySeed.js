const LibraryItem = require('../models/LibraryItem');
const LibraryCategory = require('../models/LibraryCategory');

const LIBRARY_CATEGORIES = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Essential templates, guides, and links for new navigators.',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Playbooks, lessons, and reference material for skill building.',
    sortOrder: 2,
    isActive: true
  },
  {
    name: 'Strategy',
    slug: 'strategy',
    description: 'Frameworks, models, and planning templates.',
    sortOrder: 3,
    isActive: true
  },
  {
    name: 'Psychology',
    slug: 'psychology',
    description: 'Mindset, discipline, and performance resources.',
    sortOrder: 4,
    isActive: true
  },
  {
    name: 'Tools',
    slug: 'tools',
    description: 'Platforms, calendars, and daily-use links.',
    sortOrder: 5,
    isActive: true
  },
  {
    name: 'Reading',
    slug: 'reading',
    description: 'Books and long-form learning recommendations.',
    sortOrder: 6,
    isActive: true
  },
  {
    name: 'Community',
    slug: 'community',
    description: 'Channels, events, and member resources.',
    sortOrder: 7,
    isActive: true
  }
];

const COVER = {
  logo: '/shop/fx-navigators-logo-imprint.png',
  tee: '/shop/fx-logo-tee.png',
  mug: '/shop/fx-logo-mug.png',
  hoodie: '/shop/fx-logo-hoodie.png'
};

const SAMPLE_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const LIBRARY_ITEMS = [
  {
    itemId: 'trading-journal-sheet',
    title: 'Trading Journal (Google Sheet)',
    status: 'published',
    description:
      'Track entries, exits, R-multiples, and session notes. Duplicate this template into your Google Drive and customize columns for your strategy.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    coverImage: COVER.logo,
    category: 'Getting Started',
    tags: ['journal', 'google-sheet', 'template'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 1
  },
  {
    itemId: 'session-prep-checklist',
    title: 'Pre-Session Checklist (Google Sheet)',
    status: 'published',
    description:
      'Run through news, levels, and bias before London and New York opens. Copy this sheet and tick off each item daily.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    coverImage: COVER.hoodie,
    category: 'Getting Started',
    tags: ['checklist', 'google-sheet', 'routine'],
    allowedPackages: [250, 1000],
    author: 'FX Navigators',
    sortOrder: 2
  },
  {
    itemId: 'weekly-review-sheet',
    title: 'Weekly Performance Review',
    status: 'published',
    description:
      'End-of-week review template: win rate, average R, mistakes, and focus areas for next week. Built for accountability and continuous improvement.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    coverImage: COVER.mug,
    category: 'Getting Started',
    tags: ['review', 'google-sheet', 'performance'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 3
  },
  {
    itemId: 'risk-management-playbook',
    title: 'Risk Management Playbook (PDF)',
    status: 'published',
    description:
      'Position sizing, daily loss limits, and pre-trade checklist — a concise PDF reference for disciplined risk on every session.',
    resourceType: 'pdf',
    fileUrl: SAMPLE_PDF,
    coverImage: COVER.logo,
    category: 'Education',
    tags: ['risk', 'pdf', 'checklist'],
    allowedPackages: [100, 250, 1000],
    author: 'FX Navigators',
    sortOrder: 10
  },
  {
    itemId: 'position-sizing-calculator',
    title: 'Position Sizing Calculator (Google Sheet)',
    status: 'published',
    description:
      'Enter account balance, risk %, and stop distance to get lot size suggestions. Supports major FX pairs and gold.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    coverImage: COVER.tee,
    category: 'Education',
    tags: ['risk', 'calculator', 'google-sheet'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 11
  },
  {
    itemId: 'candlestick-cheatsheet',
    title: 'Candlestick Patterns Cheatsheet (PDF)',
    status: 'published',
    description:
      'Quick-reference PDF for common reversal and continuation patterns used in price-action sessions.',
    resourceType: 'pdf',
    fileUrl: SAMPLE_PDF,
    category: 'Education',
    tags: ['price-action', 'pdf', 'patterns'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 12
  },
  {
    itemId: 'market-structure-guide',
    title: 'Market Structure Study Guide (Document)',
    status: 'published',
    description:
      'Breakdown of swing highs/lows, BOS, CHoCH, and liquidity concepts — study notes for intermediate navigators.',
    resourceType: 'document',
    fileUrl: SAMPLE_PDF,
    category: 'Strategy',
    tags: ['structure', 'smc', 'guide'],
    allowedPackages: [250, 1000],
    author: 'FX Navigators',
    sortOrder: 20
  },
  {
    itemId: 'trade-plan-template',
    title: 'Trade Plan Template (Google Sheet)',
    status: 'published',
    description:
      'Plan the setup, entry, invalidation, targets, and management rules before you click buy or sell.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    category: 'Strategy',
    tags: ['planning', 'google-sheet', 'setup'],
    allowedPackages: [100, 250, 1000],
    author: 'FX Navigators',
    sortOrder: 21
  },
  {
    itemId: 'session-times-doc',
    title: 'Session Times & Volatility Guide (PDF)',
    status: 'published',
    description:
      'When London, New York, and Asia sessions overlap — and how volatility tends to shift through the day.',
    resourceType: 'pdf',
    fileUrl: SAMPLE_PDF,
    category: 'Strategy',
    tags: ['sessions', 'volatility', 'pdf'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 22
  },
  {
    itemId: 'trading-psychology-workbook',
    title: 'Trading Psychology Workbook (PDF)',
    status: 'published',
    description:
      'Exercises for tilt recognition, pre-trade breathing, and post-loss debriefs. Print or annotate digitally.',
    resourceType: 'pdf',
    fileUrl: SAMPLE_PDF,
    coverImage: COVER.mug,
    category: 'Psychology',
    tags: ['psychology', 'workbook', 'discipline'],
    allowedPackages: [250, 1000],
    author: 'FX Navigators',
    sortOrder: 30
  },
  {
    itemId: 'mindset-reading-list',
    title: 'Mindset & Discipline Reading List',
    status: 'published',
    description:
      'Books on trading psychology, habits, and performance — curated for navigators who want to sharpen the mental game.',
    resourceType: 'book',
    externalUrl: 'https://www.goodreads.com/shelf/show/trading-psychology',
    category: 'Psychology',
    tags: ['books', 'psychology', 'reading'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 31
  },
  {
    itemId: 'recommended-trading-books',
    title: 'Recommended Trading Books',
    status: 'published',
    description:
      'Curated list of books on psychology, market structure, and risk — with links to purchase or read summaries.',
    resourceType: 'book',
    externalUrl: 'https://www.goodreads.com/shelf/show/forex-trading',
    coverImage: COVER.hoodie,
    category: 'Reading',
    tags: ['books', 'reading', 'forex'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 40
  },
  {
    itemId: 'market-wizards-notes',
    title: 'Market Wizards — Study Notes (Link)',
    status: 'published',
    description:
      'Community notes and discussion prompts based on classic interviews with top traders. Great for group study.',
    resourceType: 'link',
    externalUrl: 'https://en.wikipedia.org/wiki/Market_Wizards',
    category: 'Reading',
    tags: ['books', 'interviews', 'link'],
    allowedPackages: [100],
    author: 'FX Navigators',
    sortOrder: 41
  },
  {
    itemId: 'platform-quick-links',
    title: 'Platform & Tool Links',
    status: 'published',
    description:
      'Handy links to TradingView, economic calendar, broker platforms, and community channels used in our programs.',
    resourceType: 'link',
    externalUrl: 'https://www.tradingview.com/',
    coverImage: COVER.logo,
    category: 'Tools',
    tags: ['links', 'tools', 'tradingview'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 50
  },
  {
    itemId: 'economic-calendar',
    title: 'Forex Factory Economic Calendar',
    status: 'published',
    description:
      'Track high-impact news events, central bank speeches, and volatility windows before each session.',
    resourceType: 'link',
    externalUrl: 'https://www.forexfactory.com/calendar',
    category: 'Tools',
    tags: ['calendar', 'news', 'fundamentals'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 51
  },
  {
    itemId: 'pip-value-sheet',
    title: 'Pip Value Reference Sheet',
    status: 'published',
    description:
      'Google Sheet with pip values by pair and lot size — useful when sizing positions across multiple symbols.',
    resourceType: 'google_sheet',
    externalUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    category: 'Tools',
    tags: ['pip', 'calculator', 'google-sheet'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 52
  },
  {
    itemId: 'intro-to-forex-video',
    title: 'Intro to Forex — Video Walkthrough',
    status: 'published',
    description:
      'Short overview video covering pairs, sessions, leverage basics, and how navigators approach the market.',
    resourceType: 'video',
    externalUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_PLACEHOLDER',
    coverImage: COVER.tee,
    category: 'Education',
    tags: ['video', 'beginner', 'overview'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 13
  },
  {
    itemId: 'community-guidelines',
    title: 'Community Guidelines (PDF)',
    status: 'published',
    description:
      'How we communicate in sessions, share setups, and support each other — required reading for new members.',
    resourceType: 'pdf',
    fileUrl: SAMPLE_PDF,
    category: 'Community',
    tags: ['community', 'rules', 'pdf'],
    allowedPackages: null,
    author: 'FX Navigators',
    sortOrder: 60
  },
  {
    itemId: 'telegram-resources',
    title: 'Telegram & Community Channels',
    status: 'published',
    description:
      'Links to official FX Navigators channels, alerts, and study groups. Subscribers get access to premium rooms.',
    resourceType: 'link',
    externalUrl: 'https://telegram.org/',
    category: 'Community',
    tags: ['telegram', 'community', 'alerts'],
    allowedPackages: [250, 1000],
    author: 'FX Navigators',
    sortOrder: 61
  },
  {
    itemId: 'draft-resource-sample',
    title: '[Draft] Advanced Order Flow Notes',
    status: 'draft',
    description: 'Work in progress — order flow concepts for a future release. Should not appear in public library.',
    resourceType: 'document',
    fileUrl: '',
    category: 'Strategy',
    tags: ['draft', 'order-flow'],
    allowedPackages: [250, 1000],
    author: 'FX Navigators',
    sortOrder: 99
  }
];

async function ensureLibraryDefaults() {
  for (const cat of LIBRARY_CATEGORIES) {
    await LibraryCategory.updateOne(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true }
    );
  }

  for (const def of LIBRARY_ITEMS) {
    const { itemId, ...fields } = def;
    await LibraryItem.updateOne(
      { itemId },
      { $set: { itemId, ...fields }, $unset: { visibility: '' } },
      { upsert: true }
    );
  }
}

module.exports = { ensureLibraryDefaults, LIBRARY_ITEMS, LIBRARY_CATEGORIES };
