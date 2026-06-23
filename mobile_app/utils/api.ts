import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cachedResponseFromEntry,
  getCachedApiBody,
  isCacheEntryFresh,
  setCachedApiBody,
} from './offlineCache';
import { isOnline } from './network';

const PROD_URL = 'https://thefxnavigators.com/api';

export const API_BASE = PROD_URL;

export type ApiCacheMode = 'default' | 'no-store' | 'reload';

export type ApiFetchOptions = RequestInit & {
  /** default = stale-while-revalidate; reload = always network; no-store = skip read, still writes */
  cache?: ApiCacheMode;
};

// ─── In-memory caches to avoid async storage/NetInfo overhead per request ───
let _cachedToken: string | null | undefined = undefined; // undefined = not loaded
let _onlineState: { value: boolean; at: number } | null = null;
const ONLINE_TTL_MS = 3000;

/** Get token from memory cache, falling back to AsyncStorage on first access. */
async function getToken(): Promise<string | null> {
  if (_cachedToken !== undefined) return _cachedToken;
  _cachedToken = await AsyncStorage.getItem('token');
  return _cachedToken;
}

/** Shared token accessor for socket and other modules. */
export async function getAuthToken(): Promise<string | null> {
  return getToken();
}

/** Invalidate the memory token cache (called on 401 + after refresh). */
export function invalidateTokenCache() {
  _cachedToken = undefined;
}

/** Set token in memory after login — avoids an extra AsyncStorage read. */
export function primeAuthToken(token: string) {
  _cachedToken = token;
}

/** isOnline() with 3 s result cache. */
async function isOnlineCached(): Promise<boolean> {
  const now = Date.now();
  if (_onlineState && now - _onlineState.at < ONLINE_TTL_MS) return _onlineState.value;
  const value = await isOnline();
  _onlineState = { value, at: now };
  return value;
}

/** In-flight GET dedup: endpoint → pending Promise<Response>. */
const _inFlight = new Map<string, Promise<Response>>();
const _revalidateInFlight = new Set<string>();

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

/** Fire-and-forget cache write — never blocks the hot path. */
function cacheGetResponseAsync(endpoint: string, res: Response): void {
  if (res.status < 200 || res.status >= 300) return;
  void (async () => {
    try {
      const body = await res.clone().text();
      await setCachedApiBody(endpoint, body, res.status);
    } catch {
      /* ignore */
    }
  })();
}

/** Do a raw fetch with the stored token. No retry logic. */
async function rawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  return fetch(buildUrl(endpoint), { ...options, headers });
}

/** Try to silently refresh the stored token. Returns true on success. */
async function tryRefreshToken(): Promise<boolean> {
  if (!(await isOnlineCached())) return false;

  try {
    const token = await getToken();
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
    _cachedToken = newToken;
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

function scheduleBackgroundRevalidate(endpoint: string, options: RequestInit): void {
  if (_revalidateInFlight.has(endpoint)) return;
  _revalidateInFlight.add(endpoint);
  void (async () => {
    try {
      const res = await networkGet(endpoint, options, { skipCacheRead: true });
      if (res.ok) cacheGetResponseAsync(endpoint, res);
    } catch {
      /* ignore */
    } finally {
      _revalidateInFlight.delete(endpoint);
    }
  })();
}

async function tryServeFromCache(
  endpoint: string,
  online: boolean,
  cacheMode: ApiCacheMode,
): Promise<{ response: Response; revalidate: boolean } | null> {
  if (cacheMode === 'reload' || cacheMode === 'no-store') return null;

  const entry = await getCachedApiBody(endpoint);
  if (!entry) return null;

  const fresh = isCacheEntryFresh(entry, endpoint);
  if (!online) {
    return { response: cachedResponseFromEntry(entry), revalidate: false };
  }
  if (fresh) {
    return { response: cachedResponseFromEntry(entry), revalidate: false };
  }
  return { response: cachedResponseFromEntry(entry), revalidate: true };
}

async function networkGet(
  endpoint: string,
  options: RequestInit,
  { skipCacheRead }: { skipCacheRead?: boolean } = {},
): Promise<Response> {
  let res = await rawFetch(endpoint, options);

  if (res.status === 401) {
    invalidateTokenCache();
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await rawFetch(endpoint, options);
    } else if (await isOnlineCached()) {
      await AsyncStorage.multiRemove(['token', 'user']);
      _cachedToken = null;
      _sessionExpiredCallback?.();
    }
  }

  if (res.ok && !skipCacheRead) {
    cacheGetResponseAsync(endpoint, res);
  }

  return res;
}

/** Multipart upload (e.g. profile image). Do not set Content-Type — fetch adds the boundary. */
export async function apiUpload(
  endpoint: string,
  formData: FormData,
): Promise<Response> {
  if (!(await isOnlineCached())) return offlineResponse();

  const token = await getToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res = await fetch(buildUrl(endpoint), { method: 'POST', headers, body: formData });

  if (res.status === 401 && (await isOnlineCached())) {
    invalidateTokenCache();
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getToken();
      const retryHeaders: Record<string, string> = newToken ? { Authorization: `Bearer ${newToken}` } : {};
      res = await fetch(buildUrl(endpoint), { method: 'POST', headers: retryHeaders, body: formData });
    } else {
      await AsyncStorage.multiRemove(['token', 'user']);
      _cachedToken = null;
      _sessionExpiredCallback?.();
    }
  }

  return res;
}

/**
 * Authenticated fetch with automatic token refresh on 401.
 * - GET: memory + disk cache with stale-while-revalidate when online.
 * - GET: deduplicates concurrent identical calls.
 * - Offline GET: serves last cached response when available.
 */
export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { cache: cacheMode = 'default', ...fetchOptions } = options;
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const online = await isOnlineCached();

  if (!online) {
    if (method === 'GET') {
      const cached = await cachedGetResponse(endpoint);
      if (cached) return cached;
    }
    return offlineResponse();
  }

  if (method === 'GET' && cacheMode !== 'reload') {
    const cached = await tryServeFromCache(endpoint, online, cacheMode);
    if (cached) {
      if (cached.revalidate) scheduleBackgroundRevalidate(endpoint, fetchOptions);
      return cached.response.clone();
    }
  }

  if (method === 'GET' && _inFlight.has(endpoint)) {
    const shared = _inFlight.get(endpoint)!;
    return shared.then((r) => r.clone());
  }

  const doFetch = async (): Promise<Response> => {
    try {
      const res = await networkGet(endpoint, fetchOptions);
      if (!res.ok && method === 'GET') {
        const fallback = await cachedGetResponse(endpoint);
        if (fallback) return fallback;
      }
      return res;
    } catch {
      if (method === 'GET') {
        const cached = await cachedGetResponse(endpoint);
        if (cached) return cached;
      }
      return offlineResponse();
    }
  };

  if (method === 'GET') {
    const promise = doFetch();
    _inFlight.set(endpoint, promise);
    try {
      const res = await promise;
      return res;
    } finally {
      _inFlight.delete(endpoint);
    }
  }

  return doFetch();
}

export function isOfflineResponse(res: Response): boolean {
  return res.status === 503 && res.headers.get('X-Offline') === '1';
}

export function isCachedApiResponse(res: Response): boolean {
  return res.headers.get('X-From-Cache') === '1';
}
