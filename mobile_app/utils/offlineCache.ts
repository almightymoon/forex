import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'offline_cache:';
const MAX_DISK_ENTRIES = 60;
const MAX_MEMORY_ENTRIES = 50;

export type CacheEntry = {
  body: string;
  status: number;
  cachedAt: number;
};

const memory = new Map<string, CacheEntry>();

/** Per-endpoint freshness windows (ms). */
const TTL_RULES: Array<{ match: RegExp; ttl: number }> = [
  // Signals and notifications are time-critical — keep the stale window tiny
  { match: /notifications/i, ttl: 5_000 },
  { match: /signals/i, ttl: 10_000 },
  { match: /news/i, ttl: 3 * 60_000 },
  { match: /community\/channels\/[^/]+\/messages/i, ttl: 45_000 },
  { match: /courses/i, ttl: 15 * 60_000 },
  { match: /profile/i, ttl: 10 * 60_000 },
  { match: /payments/i, ttl: 5 * 60_000 },
];

const DEFAULT_TTL_MS = 5 * 60_000;

export function getCacheTtlMs(endpoint: string): number {
  for (const rule of TTL_RULES) {
    if (rule.match.test(endpoint)) return rule.ttl;
  }
  return DEFAULT_TTL_MS;
}

export function isCacheEntryFresh(entry: CacheEntry, endpoint: string): boolean {
  return Date.now() - entry.cachedAt < getCacheTtlMs(endpoint);
}

function cacheKey(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${PREFIX}${clean}`;
}

function touchMemory(key: string, entry: CacheEntry): CacheEntry {
  if (memory.has(key)) memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
    else break;
  }
  return entry;
}

export function peekMemoryCache(endpoint: string): CacheEntry | null {
  const key = cacheKey(endpoint);
  const hit = memory.get(key);
  if (!hit) return null;
  memory.delete(key);
  memory.set(key, hit);
  return hit;
}

export async function getCachedApiBody(endpoint: string): Promise<CacheEntry | null> {
  const mem = peekMemoryCache(endpoint);
  if (mem) return mem;

  try {
    const raw = await AsyncStorage.getItem(cacheKey(endpoint));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    touchMemory(cacheKey(endpoint), entry);
    return entry;
  } catch {
    return null;
  }
}

async function evictStaleDiskEntries(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length <= MAX_DISK_ENTRIES) return;

    const ranked = await Promise.all(
      cacheKeys.map(async (k) => {
        try {
          const raw = await AsyncStorage.getItem(k);
          const parsed = raw ? (JSON.parse(raw) as CacheEntry) : null;
          return { k, cachedAt: parsed?.cachedAt ?? 0 };
        } catch {
          return { k, cachedAt: 0 };
        }
      }),
    );
    ranked.sort((a, b) => a.cachedAt - b.cachedAt);
    const remove = ranked.slice(0, ranked.length - MAX_DISK_ENTRIES).map((e) => e.k);
    if (remove.length > 0) await AsyncStorage.multiRemove(remove);
    for (const k of remove) memory.delete(k);
  } catch {
    /* ignore */
  }
}

export async function setCachedApiBody(endpoint: string, body: string, status: number): Promise<void> {
  try {
    const key = cacheKey(endpoint);
    const entry: CacheEntry = { body, status, cachedAt: Date.now() };
    touchMemory(key, entry);
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    void evictStaleDiskEntries();
  } catch {
    /* ignore storage errors */
  }
}

export function cachedResponseFromEntry(entry: CacheEntry): Response {
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      'Content-Type': 'application/json',
      'X-From-Cache': '1',
    },
  });
}

export function isCachedResponse(res: Response): boolean {
  return res.headers.get('X-From-Cache') === '1';
}

export function clearMemoryCache(): void {
  memory.clear();
}

export async function clearOfflineCache(): Promise<void> {
  clearMemoryCache();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    /* ignore */
  }
}

/** Drop cached responses whose endpoint matches, e.g. after a signal push arrives. */
export async function invalidateCachedEndpoints(pattern: RegExp): Promise<void> {
  for (const key of [...memory.keys()]) {
    if (pattern.test(key)) memory.delete(key);
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => k.startsWith(PREFIX) && pattern.test(k));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    /* ignore */
  }
}
