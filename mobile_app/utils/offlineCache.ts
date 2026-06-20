import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'offline_cache:';

type CacheEntry = {
  body: string;
  status: number;
  cachedAt: number;
};

function cacheKey(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${PREFIX}${clean}`;
}

export async function getCachedApiBody(endpoint: string): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(endpoint));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export async function setCachedApiBody(endpoint: string, body: string, status: number): Promise<void> {
  try {
    const entry: CacheEntry = { body, status, cachedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(endpoint), JSON.stringify(entry));
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

export async function clearOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    /* ignore */
  }
}
