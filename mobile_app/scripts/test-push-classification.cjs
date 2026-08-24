#!/usr/bin/env node
/**
 * Unit-style tests for push registration error classification (no device / no build).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const srcPath = path.join(__dirname, '..', 'utils', 'pushNotifications.ts');
const source = fs.readFileSync(srcPath, 'utf8');

const fnMatch = source.match(
  /export function classifyPushRegistrationError[\s\S]*?^}/m
);
assert(fnMatch, 'classifyPushRegistrationError not found');

const snippet = `
${fnMatch[0].replace('export function', 'function')}
module.exports = { classifyPushRegistrationError };
`;

const { outputText } = ts.transpileModule(snippet, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
});

const mod = { exports: {} };
vm.runInNewContext(outputText, { module: mod, exports: mod.exports, console });
const { classifyPushRegistrationError } = mod.exports;

const fcm = classifyPushRegistrationError(
  new Error(
    'Make sure to complete the guide at https://docs.expo.dev/push-notifications/fcm-credentials/ : Default FirebaseApp is not initialized in this process com.fxnavigators.app. Make sure to call FirebaseApp.initializeApp(Context) first.'
  )
);
assert.strictEqual(fcm.ok, false);
assert.strictEqual(fcm.reason, 'fcm_not_configured');
assert(fcm.message.includes('google-services.json'));

const other = classifyPushRegistrationError(new Error('Network request failed'));
assert.strictEqual(other.ok, false);
assert.strictEqual(other.reason, 'error');

console.log('✓ classifyPushRegistrationError tests passed');
