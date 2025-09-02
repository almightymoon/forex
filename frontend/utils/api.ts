// API configuration utility
import { env } from '../lib/env';

export const API_BASE_URL = env.API_BASE_URL;

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 requests per minute

function isRateLimited(endpoint: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!requestCounts.has(endpoint)) {
    requestCounts.set(endpoint, []);
  }
  
  const requests = requestCounts.get(endpoint);
  // Remove old requests outside the window
  const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  requestCounts.set(endpoint, recentRequests);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  recentRequests.push(now);
  return false;
}

// Network connectivity check
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🌐 Checking network connectivity...');
    const response = await fetch(API_BASE_URL, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    console.log('✅ Network connectivity check passed');
    return true;
  } catch (error) {
    console.error('❌ Network connectivity check failed:', error);
    return false;
  }
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  try {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    // Remove 'api/' prefix from endpoint if API_BASE_URL already includes '/api'
    const finalEndpoint = API_BASE_URL.includes('/api') && cleanEndpoint.startsWith('api/') 
      ? cleanEndpoint.slice(4) 
      : cleanEndpoint;
    const url = `${API_BASE_URL}/${finalEndpoint}`;
    console.log('🔗 Built API URL:', url);
    return url;
  } catch (error) {
    console.error('❌ Error building API URL:', error);
    throw error;
  }
};

// Helper function for API requests with common headers and caching
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {},
  useCache: boolean = true
): Promise<Response> => {
  try {
    console.log('🌐 Making API request:', endpoint);
    
    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      throw new Error('Network connectivity issue detected');
    }
    
    const url = buildApiUrl(endpoint);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    console.log('🔑 Token available:', !!token);
    
    // Check rate limiting
    if (isRateLimited(endpoint)) {
      console.warn(`⚠️ Rate limited for endpoint: ${endpoint}`);
      throw new Error('Too many requests, please try again later');
    }
    
    // Check cache for GET requests
    if (useCache && options.method === 'GET' || !options.method) {
      const cacheKey = `${endpoint}:${token || 'no-token'}`;
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`✅ Returning cached data for: ${endpoint}`);
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    console.log('📤 Request details:', {
      url,
      method: options.method || 'GET',
      headers: defaultHeaders,
      body: options.body ? 'Present' : 'None'
    });

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    console.log('📥 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Cache successful GET responses
    if (useCache && response.ok && (options.method === 'GET' || !options.method)) {
      try {
        const data = await response.clone().json();
        const cacheKey = `${endpoint}:${token || 'no-token'}`;
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        console.log(`💾 Cached response for: ${endpoint}`);
      } catch (error) {
        console.warn('⚠️ Failed to cache response:', error);
      }
    }

    return response;
  } catch (error) {
    console.error('❌ API request failed:', {
      endpoint,
      error: error.message,
      stack: error.stack
    });
    
    // Handle network errors gracefully
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🌐 Network error detected');
      throw new Error(`Network error: Unable to connect to server. Please check your internet connection and try again.`);
    }
    
    throw error;
  }
};

// Helper function to clear cache for specific endpoint
export const clearCache = (endpoint?: string) => {
  if (endpoint) {
    // Clear specific endpoint cache
    for (const [key] of cache) {
      if (key.startsWith(endpoint)) {
        cache.delete(key);
      }
    }
    console.log(`🗑️ Cleared cache for: ${endpoint}`);
  } else {
    // Clear all cache
    cache.clear();
    console.log('🗑️ Cleared all cache');
  }
};
