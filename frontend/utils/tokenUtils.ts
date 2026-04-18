import { buildApiUrl } from './api';
import { clearMonthlyFeeAccessLock } from './monthlyFeeAccessLock';

interface TokenRefreshResponse {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Handle session expiration by clearing tokens and redirecting to login
 * @param message - Optional message to show to user
 */
export const handleSessionExpiration = (message?: string) => {
  console.log('Handling session expiration:', message);
  
  // Clear all authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearMonthlyFeeAccessLock();
  
  // Clear token cookie
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // Show notification if available
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message || 'Your session has expired. Please log in again.', 'error');
  }
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  try {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      return { success: false, error: 'No token found' };
    }

    const response = await fetch(buildApiUrl('api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        return { success: true, token: data.token };
      }
    }

    return { success: false, error: 'Failed to refresh token' };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'Network error during token refresh' };
  }
};

export const checkTokenExpiry = (token: string): { isExpired: boolean; expiresIn: number } => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    
    return {
      isExpired: expiresIn <= 0,
      expiresIn: Math.max(0, expiresIn)
    };
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return { isExpired: true, expiresIn: 0 };
  }
};

/**
 * Make an API call with automatic token refresh on 401 errors
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchWithTokenRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // No token, redirect to login
    window.location.href = '/login';
    throw new Error('No authentication token found');
  }

  // Check if token is expired
  const { isExpired } = checkTokenExpiry(token);
  
  if (isExpired) {
    console.log('Token is expired, attempting refresh...');
    const refreshResult = await refreshToken();
    
    if (!refreshResult.success) {
      console.error('Token refresh failed:', refreshResult.error);
      handleSessionExpiration('Your session has expired. Please log in again.');
      throw new Error('Token refresh failed');
    }
  }

  // Make the request with current token
  const currentToken = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentToken}`,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // If we get a 401, try to refresh the token once
  if (response.status === 401) {
    console.log('Received 401, attempting token refresh...');
    
    // Check if response contains session expiration info
    try {
      const errorData = await response.clone().json();
      if (errorData.sessionExpired && errorData.redirectTo) {
        console.log('Session expired, redirecting to:', errorData.redirectTo);
        handleSessionExpiration(errorData.message || 'Session expired');
        throw new Error('Session expired');
      }
    } catch (jsonError) {
      // If we can't parse JSON, continue with token refresh
    }
    
    const refreshResult = await refreshToken();
    
    if (refreshResult.success) {
      // Retry the request with the new token
      const newToken = localStorage.getItem('token');
      const retryHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...options.headers
      };

      return fetch(url, {
        ...options,
        headers: retryHeaders
      });
    } else {
      // Refresh failed, redirect to login
      console.error('Token refresh failed on 401:', refreshResult.error);
      handleSessionExpiration('Authentication failed');
      throw new Error('Authentication failed');
    }
  }

  return response;
};
