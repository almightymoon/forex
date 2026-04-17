/**
 * Package Perks Configuration
 * Defines what features/perks each package subscription includes
 */

const PACKAGE_PERKS = {
  // FX Launch - $100 (Basic Package)
  100: {
    name: 'FX Launch',
    price: 100,
    perks: {
      // Trading Signals
      tradingSignals: {
        enabled: true,
        limit: 'unlimited', // or number for limited access
        description: 'Access to Forex Trading Signals'
      },
      // Mentorship
      mentorship: {
        enabled: true,
        type: 'basic', // basic, live, pro
        sessionsPerMonth: 2, // 2 basic mentorship sessions per month
        description: 'Forex Basic Mentorship (2 sessions/month)'
      },
      // Premium Indicators
      premiumIndicators: {
        enabled: true,
        access: 'limited', // limited, full
        description: 'Access to Premium Indicators'
      },
      // Auto Trading
      autoTrading: {
        enabled: true,
        description: 'Auto Trading Access'
      },
      // Community
      community: {
        enabled: true,
        access: 'standard', // standard, priority, vip
        description: 'Community Support'
      },
      // Support
      support: {
        enabled: true,
        type: 'email', // email, priority, vip
        responseTime: '48h',
        description: 'Email Support (48h response)'
      },
      // Live Sessions
      liveSessions: {
        enabled: false,
        description: 'Live Online Mentorship Sessions'
      },
      // Market Analysis
      marketAnalysis: {
        enabled: false,
        description: 'Weekly Market Analysis'
      },
      // Risk Management
      riskManagement: {
        enabled: false,
        description: 'Risk Management Strategies'
      },
      // Physical Classes
      physicalClasses: {
        enabled: false,
        description: 'Physical (On-Ground) Classes'
      },
      // One-on-One Coaching
      oneOnOneCoaching: {
        enabled: false,
        description: '1-on-1 Coaching Sessions'
      },
      // Advanced Strategies
      advancedStrategies: {
        enabled: false,
        description: 'Advanced Trading Strategies'
      },
      // Lifetime Access
      lifetimeAccess: {
        enabled: false,
        description: 'Lifetime Access'
      },
      // VIP Community
      vipCommunity: {
        enabled: false,
        description: 'VIP Community Access'
      }
    }
  },

  // FX Scale - $250 (Popular Package)
  250: {
    name: 'FX Scale',
    price: 250,
    perks: {
      tradingSignals: {
        enabled: true,
        limit: 'unlimited',
        description: 'Access to Forex Trading Signals'
      },
      mentorship: {
        enabled: true,
        type: 'live',
        sessionsPerMonth: 4, // 4 live mentorship sessions per month
        description: 'Live Online Mentorship Sessions (4 sessions/month)'
      },
      premiumIndicators: {
        enabled: true,
        access: 'full',
        description: 'Full Access to Premium Indicators'
      },
      autoTrading: {
        enabled: true,
        description: 'Auto Trading Access'
      },
      community: {
        enabled: true,
        access: 'priority',
        description: 'Priority Community Support'
      },
      support: {
        enabled: true,
        type: 'priority',
        responseTime: '24h',
        description: 'Priority Support (24h response)'
      },
      liveSessions: {
        enabled: true,
        description: 'Live Online Mentorship Sessions'
      },
      marketAnalysis: {
        enabled: true,
        frequency: 'weekly',
        description: 'Weekly Market Analysis'
      },
      riskManagement: {
        enabled: true,
        description: 'Risk Management Strategies'
      },
      physicalClasses: {
        enabled: false,
        description: 'Physical (On-Ground) Classes'
      },
      oneOnOneCoaching: {
        enabled: false,
        description: '1-on-1 Coaching Sessions'
      },
      advancedStrategies: {
        enabled: false,
        description: 'Advanced Trading Strategies'
      },
      lifetimeAccess: {
        enabled: false,
        description: 'Lifetime Access'
      },
      vipCommunity: {
        enabled: false,
        description: 'VIP Community Access'
      }
    }
  },

  // FX Legacy - $1000 (Elite Package)
  1000: {
    name: 'FX Legacy',
    price: 1000,
    perks: {
      tradingSignals: {
        enabled: true,
        limit: 'unlimited',
        description: 'Access to Forex Trading Signals'
      },
      mentorship: {
        enabled: true,
        type: 'pro',
        sessionsPerMonth: 'unlimited',
        description: 'Forex Pro Mentorship (Unlimited sessions)'
      },
      premiumIndicators: {
        enabled: true,
        access: 'full',
        description: 'Full Access to Premium Indicators'
      },
      autoTrading: {
        enabled: true,
        description: 'Auto Trading Access'
      },
      community: {
        enabled: true,
        access: 'vip',
        description: 'VIP Community Access'
      },
      support: {
        enabled: true,
        type: 'vip',
        responseTime: '2h',
        description: 'VIP Support (2h response)'
      },
      liveSessions: {
        enabled: true,
        description: 'Live Online Mentorship Sessions'
      },
      marketAnalysis: {
        enabled: true,
        frequency: 'daily',
        description: 'Daily Market Analysis'
      },
      riskManagement: {
        enabled: true,
        description: 'Advanced Risk Management Strategies'
      },
      physicalClasses: {
        enabled: true,
        description: 'Physical (On-Ground) Classes'
      },
      oneOnOneCoaching: {
        enabled: true,
        sessionsPerMonth: 2,
        description: '1-on-1 Coaching Sessions (2 sessions/month)'
      },
      advancedStrategies: {
        enabled: true,
        description: 'Advanced Trading Strategies'
      },
      lifetimeAccess: {
        enabled: true,
        description: 'Lifetime Access'
      },
      vipCommunity: {
        enabled: true,
        description: 'VIP Community Access'
      }
    }
  }
};

/**
 * Get perks for a specific package price
 * @param {number} packagePrice - The package price (100, 250, or 1000)
 * @returns {object|null} Package perks configuration or null if not found
 */
function getPackagePerks(packagePrice) {
  return PACKAGE_PERKS[packagePrice] || null;
}

/**
 * Check if a user has access to a specific perk
 * @param {number} packagePrice - User's package price
 * @param {string} perkName - Name of the perk to check
 * @returns {boolean} True if user has access, false otherwise
 */
function hasPerkAccess(packagePrice, perkName) {
  const packageData = getPackagePerks(packagePrice);
  if (!packageData) return false;
  
  const perk = packageData.perks[perkName];
  return perk ? perk.enabled : false;
}

/**
 * Get all enabled perks for a package
 * @param {number} packagePrice - The package price
 * @returns {array} Array of enabled perk names
 */
function getEnabledPerks(packagePrice) {
  const packageData = getPackagePerks(packagePrice);
  if (!packageData) return [];
  
  return Object.keys(packageData.perks).filter(
    perkName => packageData.perks[perkName].enabled
  );
}

/**
 * Get perk details for a specific perk in a package
 * @param {number} packagePrice - The package price
 * @param {string} perkName - Name of the perk
 * @returns {object|null} Perk details or null
 */
function getPerkDetails(packagePrice, perkName) {
  const packageData = getPackagePerks(packagePrice);
  if (!packageData) return null;
  
  return packageData.perks[perkName] || null;
}

module.exports = {
  PACKAGE_PERKS,
  getPackagePerks,
  hasPerkAccess,
  getEnabledPerks,
  getPerkDetails
};
