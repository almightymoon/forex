/**
 * Disable console logs in production
 * Only keeps error and warn for debugging critical issues
 */
const disableConsoleInProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    // Keep console.error and console.warn for critical issues
    const noop = () => {};
    
    // Disable less critical console methods
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    
    console.info('Console logs disabled in production (only error/warn remain)');
  }
};

module.exports = disableConsoleInProduction;
