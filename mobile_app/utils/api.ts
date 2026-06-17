import AsyncStorage from '@react-native-async-storage/async-storage';

const PROD_URL = 'https://thefxnavigators.com/api';

export const API_BASE = PROD_URL;

export function buildUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const path = clean.startsWith('api/') ? clean.slice(4) : clean;
  return `${API_BASE}/${path}`;
}

/** Do a raw fetch with the stored token. No retry logic. */
async function rawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await AsyncStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  return fetch(buildUrl(endpoint), { ...options, headers });
}

/** Try to silently refresh the stored token. Returns true on success. */
async function tryRefreshToken(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return false;

    const res = await fetch(buildUrl('auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    const newToken: string | undefined = data.token;
    if (!newToken) return false;

    await AsyncStorage.setItem('token', newToken);
    return true;
  } catch {
    return false;
  }
}

let _sessionExpiredCallback: (() => void) | null = null;

/** Register a callback to be called when the session expires and refresh fails. */
export function onSessionExpired(cb: () => void) {
  _sessionExpiredCallback = cb;
}

/**
 * Authenticated fetch with automatic token refresh on 401.
 * If refresh also fails, fires onSessionExpired so the app can redirect to login.
 */
/** Multipart upload (e.g. profile image). Do not set Content-Type — fetch adds the boundary. */
export async function apiUpload(
  endpoint: string,
  formData: FormData,
): Promise<Response> {
  const token = await AsyncStorage.getItem('token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res = await fetch(buildUrl(endpoint), { method: 'POST', headers, body: formData });

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await AsyncStorage.getItem('token');
      const retryHeaders: Record<string, string> = newToken ? { Authorization: `Bearer ${newToken}` } : {};
      res = await fetch(buildUrl(endpoint), { method: 'POST', headers: retryHeaders, body: formData });
    } else {
      await AsyncStorage.multiRemove(['token', 'user']);
      _sessionExpiredCallback?.();
    }
  }

  return res;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  let res = await rawFetch(endpoint, options);

  // On 401, attempt a silent token refresh and retry once
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await rawFetch(endpoint, options);
    } else {
      // Refresh failed — session is truly expired. Clear auth and notify app.
      await AsyncStorage.multiRemove(['token', 'user']);
      _sessionExpiredCallback?.();
    }
  }

  return res;
}
