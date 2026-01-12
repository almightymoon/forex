const Settings = require('../models/Settings');

const validatePasswordPolicy = async (password) => {
  try {
    const settings = await Settings.getSettings();
    const policy = settings.security.passwordPolicy;
    
    const errors = [];
    
    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    
    // Check uppercase requirement
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check numbers requirement
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Check symbols requirement
    if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Password policy validation error:', error);
    // If settings can't be loaded, use basic validation
    return {
      isValid: password.length >= 6,
      errors: password.length >= 6 ? [] : ['Password must be at least 6 characters long']
    };
  }
};

const passwordPolicyMiddleware = async (req, res, next) => {
  // Only validate password if it's being set/changed
  if (req.body.password) {
    const validation = await validatePasswordPolicy(req.body.password);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: validation.errors
      });
    }
  }
  
  next();
};

module.exports = {
  validatePasswordPolicy,
  passwordPolicyMiddleware
};
