import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cachedResponseFromEntry,
  getCachedApiBody,
  setCachedApiBody,
} from './offlineCache';
import { isOnline } from './network';

const PROD_URL = 'https://thefxnavigators.com/api';

export const API_BASE = PROD_URL;

export function buildUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const path = clean.startsWith('api/') ? clean.slice(4) : clean;
  return `${API_BASE}/${path}`;
}

function offlineResponse(message = 'You are offline. Please check your connection.'): Response {
  return new Response(JSON.stringify({ message, offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'X-Offline': '1' },
  });
}

async function cachedGetResponse(endpoint: string): Promise<Response | null> {
  const entry = await getCachedApiBody(endpoint);
  if (!entry) return null;
  return cachedResponseFromEntry(entry);
}

async function cacheGetResponse(endpoint: string, res: Response): Promise<void> {
  if (res.status < 200 || res.status >= 300) return;
  try {
    const body = await res.clone().text();
    await setCachedApiBody(endpoint, body, res.status);
  } catch {
    /* ignore */
  }
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
  if (!(await isOnline())) return false;

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

/** Multipart upload (e.g. profile image). Do not set Content-Type — fetch adds the boundary. */
export async function apiUpload(
  endpoint: string,
  formData: FormData,
): Promise<Response> {
  if (!(await isOnline())) return offlineResponse();

  const token = await AsyncStorage.getItem('token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res = await fetch(buildUrl(endpoint), { method: 'POST', headers, body: formData });

  if (res.status === 401 && (await isOnline())) {
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

/**
 * Authenticated fetch with automatic token refresh on 401.
 * GET requests cache successful responses and serve them when offline.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  const online = await isOnline();

  if (!online) {
    if (method === 'GET') {
      const cached = await cachedGetResponse(endpoint);
      if (cached) return cached;
    }
    return offlineResponse();
  }

  try {
    let res = await rawFetch(endpoint, options);

    if (res.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        res = await rawFetch(endpoint, options);
      } else if (await isOnline()) {
        await AsyncStorage.multiRemove(['token', 'user']);
        _sessionExpiredCallback?.();
      }
    }

    if (method === 'GET' && res.ok) {
      await cacheGetResponse(endpoint, res);
    }

    return res;
  } catch {
    if (method === 'GET') {
      const cached = await cachedGetResponse(endpoint);
      if (cached) return cached;
    }
    return offlineResponse();
  }
}

export function isOfflineResponse(res: Response): boolean {
  return res.status === 503 && res.headers.get('X-Offline') === '1';
}
