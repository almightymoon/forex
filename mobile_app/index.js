/**
 * Expo dev tools call useKeepAwake on Android before the activity is always
 * ready, which throws "Unable to activate keep awake" as an uncaught rejection.
 * Swallow that race here so it does not surface as a red error screen.
 */
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    const keepAwake = requireNativeModule('ExpoKeepAwake');
    const originalActivate = keepAwake.activate;
    if (typeof originalActivate === 'function') {
      keepAwake.activate = (...args) =>
        Promise.resolve(originalActivate(...args)).catch(() => {});
    }
  } catch {
    // Module unavailable in some runtimes — safe to ignore.
  }
}

require('expo-router/entry');
