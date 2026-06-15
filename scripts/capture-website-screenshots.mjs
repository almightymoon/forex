#!/usr/bin/env node
/**
 * Capture full-page screenshots of all website routes and dashboard tabs.
 * Usage: node scripts/capture-website-screenshots.mjs
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'website-screenshots');
const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3001';
const API_URL = process.env.SCREENSHOT_API_URL || 'http://localhost:4000';

const ACCOUNTS = {
  admin: { email: 'admin@forexnavigators.com', password: 'admin123' },
  teacher: { email: 'teacher@forexnavigators.com', password: 'teacher123' },
  student: { email: 'student@forexnavigators.com', password: 'student123' },
};

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/community',
  '/payment',
  '/payment/success',
  '/payment/failed',
  '/payment-pending',
  '/select-package',
  '/subscription',
  '/subscription/upgrade',
  '/404',
];

const STUDENT_ROUTES = [
  '/dashboard',
  '/dashboard/progress',
  '/dashboard/rank-rewards',
  '/profile',
  '/settings',
  '/notifications',
  '/referrals',
  '/withdrawals',
  '/certificates',
  '/monthly-fee',
  '/mt5',
];

const DASHBOARD_TABS = [
  'overview',
  'courses',
  'browse',
  'live-sessions',
  'signals',
  'tradingview',
  'assignments',
  'community',
  'certificates',
  'rank-rewards',
];

const ADMIN_TABS = [
  'overview',
  'users',
  'payments',
  'monthly-fee',
  'commissions',
  'rank-rewards',
  'packages',
  'analytics',
  'promocodes',
  'notifications',
  'logs',
  'landing-progress',
  'landing-joiners',
  'settings',
];

const TEACHER_TABS = [
  'overview',
  'students',
  'courses',
  'assignments',
  'live-sessions',
  'signals',
  'analytics',
  'communications',
  'community',
  'landing-progress',
  'landing-joiners',
  'certificates',
];

const manifest = [];

function slug(path) {
  return path.replace(/^\//, '').replace(/\//g, '__') || 'home';
}

async function login(role) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[role]),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Login failed for ${role}: ${data.message || data.error}`);
  return { token: data.token, user: data.user };
}

async function injectAuth(page, auth) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    document.cookie = `token=${token}; path=/; max-age=86400`;
  }, auth);
}

async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function screenshot(page, name, url) {
  const filename = `${name}.png`;
  const filepath = join(OUT_DIR, filename);
  console.log(`  → ${filename}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page);
  await page.screenshot({ path: filepath, fullPage: true });
  manifest.push({ file: filename, url, name });
}

async function clickTab(page, label) {
  const tab = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
  if (await tab.count()) {
    await tab.click();
    await waitForPageReady(page);
    return true;
  }
  const link = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
  if (await link.count()) {
    await link.click();
    await waitForPageReady(page);
    return true;
  }
  return false;
}

async function fetchCourseId(token) {
  try {
    const res = await fetch(`${API_URL}/api/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const courses = Array.isArray(data) ? data : data.courses || data.data || [];
    const first = courses[0];
    return first?._id || first?.id || null;
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('\n📸 Public pages');
  for (const route of PUBLIC_ROUTES) {
    await screenshot(page, `public__${slug(route)}`, `${BASE_URL}${route}`);
  }

  console.log('\n📸 Student pages');
  const studentAuth = await login('student');
  await injectAuth(page, studentAuth);
  for (const route of STUDENT_ROUTES) {
    await screenshot(page, `student__${slug(route)}`, `${BASE_URL}${route}`);
  }
  for (const tab of DASHBOARD_TABS) {
    await screenshot(page, `student__dashboard__tab-${tab}`, `${BASE_URL}/dashboard?tab=${tab}`);
  }

  const courseId = await fetchCourseId(studentAuth.token);
  if (courseId) {
    await screenshot(page, `student__course__${courseId}`, `${BASE_URL}/course/${courseId}`);
  } else {
    console.log('  ⚠ No courses found — skipping /course/[id]');
  }

  console.log('\n📸 Teacher pages');
  const teacherAuth = await login('teacher');
  await injectAuth(page, teacherAuth);
  await screenshot(page, 'teacher__dashboard', `${BASE_URL}/teacher`);
  const teacherTabLabels = {
    overview: 'Overview',
    students: 'Students',
    courses: 'Courses',
    assignments: 'Assignments',
    'live-sessions': 'Live Sessions',
    signals: 'Trading Signals',
    analytics: 'Analytics',
    communications: 'Communications',
    community: 'Community',
    'landing-progress': 'Landing progress',
    'landing-joiners': 'Landing joiners',
    certificates: 'Certificates',
  };
  for (const tab of TEACHER_TABS) {
    await page.goto(`${BASE_URL}/teacher`, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await clickTab(page, teacherTabLabels[tab] || tab);
    await page.screenshot({ path: join(OUT_DIR, `teacher__tab-${tab}.png`), fullPage: true });
    manifest.push({ file: `teacher__tab-${tab}.png`, url: `/teacher#${tab}`, name: `teacher tab ${tab}` });
    console.log(`  → teacher__tab-${tab}.png`);
  }

  console.log('\n📸 Admin pages');
  const adminAuth = await login('admin');
  await injectAuth(page, adminAuth);
  await screenshot(page, 'admin__dashboard', `${BASE_URL}/admin`);
  const adminTabLabels = {
    overview: 'Overview',
    users: 'Users',
    payments: 'Payments',
    'monthly-fee': 'Monthly Fee',
    commissions: 'Commissions',
    'rank-rewards': 'Rank Rewards',
    packages: 'Packages',
    analytics: 'Analytics',
    promocodes: 'Promo Codes',
    notifications: 'Notifications',
    logs: 'Logs',
    'landing-progress': 'Landing progress',
    'landing-joiners': 'Landing joiners',
    settings: 'Settings',
  };
  for (const tab of ADMIN_TABS) {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await clickTab(page, adminTabLabels[tab]);
    await page.screenshot({ path: join(OUT_DIR, `admin__tab-${tab}.png`), fullPage: true });
    manifest.push({ file: `admin__tab-${tab}.png`, url: `/admin#${tab}`, name: `admin tab ${tab}` });
    console.log(`  → admin__tab-${tab}.png`);
  }

  await browser.close();

  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), baseUrl: BASE_URL, pages: manifest }, null, 2));

  const zipPath = join(ROOT, 'website-screenshots.zip');
  execSync(`cd "${ROOT}" && rm -f website-screenshots.zip && zip -r website-screenshots.zip website-screenshots`, { stdio: 'inherit' });

  console.log(`\n✅ Done! ${manifest.length} screenshots saved.`);
  console.log(`   Folder: ${OUT_DIR}`);
  console.log(`   Zip:    ${zipPath}`);
}

main().catch((err) => {
  console.error('❌ Screenshot capture failed:', err);
  process.exit(1);
});
