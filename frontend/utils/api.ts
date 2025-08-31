// API configuration utility
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper function for API requests with common headers
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers: defaultHeaders,
  });
};
