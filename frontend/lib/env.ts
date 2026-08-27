// Environment configuration for client-side usage
// Only variables prefixed with NEXT_PUBLIC_ are available on the client side

export const env = {
  // API Configuration
  API_BASE_URL: (() => {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // If no environment variable is set, use production URL
    if (!backendUrl) {
      return 'https://thefxnavigators.com/api';
    }
    
    // If localhost is set, use production URL instead
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      return 'https://thefxnavigators.com/api';
    }
    
    // Otherwise use the provided URL and add /api if needed
    return backendUrl + (backendUrl.includes('/api') ? '' : '/api');
  })(),
  WS_URL: (() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.BACKEND_URL;
    
    // If no environment variable is set, use production URL
    if (!wsUrl) {
      return 'https://thefxnavigators.com';
    }
    
    // If localhost is set, use production URL instead
    if (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) {
      return 'https://thefxnavigators.com';
    }
    
    return wsUrl;
  })(),
  
  // Environment
  NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development',
  
  // Feature Flags
  ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  ENABLE_ERROR_SUPPRESSION: process.env.NEXT_PUBLIC_ENABLE_ERROR_SUPPRESSION !== 'false',
  
  // External Services
  CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Analytics
  GOOGLE_ANALYTICS_ID:
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || 'G-9YREN3L4TL',
  MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
} as const;

// Helper function to check if we're in development mode
export const isDevelopment = () => {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  return nodeEnv === 'development';
};

// Helper function to check if we're in production mode
export const isProduction = () => {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  return nodeEnv === 'production';
};

// Helper function to check if debug mode is enabled
export const isDebugEnabled = () => {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  const enableDebug = process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
  return nodeEnv === 'development' || enableDebug;
};
