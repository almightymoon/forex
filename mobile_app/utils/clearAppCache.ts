import { Image } from 'expo-image';
import { clearDashboardSnapshot } from './dashboardCache';
import { clearOfflineCache } from './offlineCache';

/** Wipe API + image caches. Does not clear auth or user preferences. */
export async function clearAppCache(): Promise<void> {
  await Promise.all([
    clearOfflineCache(),
    clearDashboardSnapshot(),
    Image.clearDiskCache(),
    Image.clearMemoryCache(),
  ]);
}
