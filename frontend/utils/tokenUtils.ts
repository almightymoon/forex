import { buildApiUrl } from './api';

interface TokenRefreshResponse {
  success: boolean;
  token?: string;
  error?: string;
}

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
