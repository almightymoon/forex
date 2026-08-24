#!/usr/bin/env node
/**
 * Pre-build validation for WhatsApp-style Android push (FCM).
 * Run from mobile_app/: node scripts/validate-push-setup.cjs
 *
 * Exits 0 only when google-services.json + app.json are correctly wired.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PACKAGE = 'com.fxnavigators.app';
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

const appJsonPath = path.join(ROOT, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const android = appJson?.expo?.android || {};
const googleServicesFile = android.googleServicesFile;
const pkg = android.package;

if (pkg === PACKAGE) ok(`app.json package is ${PACKAGE}`);
else fail(`app.json package is "${pkg}", expected "${PACKAGE}"`);

if (googleServicesFile) ok(`app.json googleServicesFile = ${googleServicesFile}`);
else fail('app.json missing expo.android.googleServicesFile');

const gsPath = path.join(ROOT, googleServicesFile || 'google-services.json');
if (!fs.existsSync(gsPath)) {
  fail(
    `Missing ${path.relative(ROOT, gsPath)}\n` +
      '  Download from Firebase Console → Project settings → Your apps → Android app\n' +
      '  Package must be com.fxnavigators.app\n' +
      '  Guide: https://docs.expo.dev/push-notifications/fcm-credentials/'
  );
} else {
  ok(`Found ${path.relative(ROOT, gsPath)}`);
  let gs;
  try {
    gs = JSON.parse(fs.readFileSync(gsPath, 'utf8'));
  } catch (e) {
    fail(`google-services.json is not valid JSON: ${e.message}`);
    gs = null;
  }
  if (gs) {
    const clients = gs.client || [];
    const packages = clients
      .map((c) => c?.client_info?.android_client_info?.package_name)
      .filter(Boolean);
    if (packages.includes(PACKAGE)) {
      ok(`google-services.json registers package ${PACKAGE}`);
    } else {
      fail(
        `google-services.json has packages [${packages.join(', ') || 'none'}], ` +
          `expected ${PACKAGE}`
      );
    }
    const projectId = gs.project_info?.project_id;
    if (projectId) ok(`Firebase project_id = ${projectId}`);
    else fail('google-services.json missing project_info.project_id');
  }
}

const classifySource = fs.readFileSync(
  path.join(ROOT, 'utils', 'pushNotifications.ts'),
  'utf8'
);
if (
  classifySource.includes('fcm_not_configured') &&
  /firebaseapp/i.test(classifySource)
) {
  ok('Client classifies FirebaseApp / FCM credential errors');
} else {
  fail('pushNotifications.ts missing FCM error classification');
}

if ((android.permissions || []).includes('android.permission.POST_NOTIFICATIONS')) {
  ok('POST_NOTIFICATIONS permission declared');
} else {
  fail('Missing android.permission.POST_NOTIFICATIONS in app.json');
}

console.log('');
if (failed) {
  console.error(`Push setup validation FAILED (${failed} issue(s)). Fix before building.`);
  process.exit(1);
}
console.log('Push setup validation PASSED — safe to eas build for Android.');
process.exit(0);
