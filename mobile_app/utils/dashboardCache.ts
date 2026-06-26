import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityItem, NormalizedCourse, NormalizedNews, NormalizedSignal } from './normalize';

const KEY = 'dashboard_snapshot_v1';
const MAX_AGE_MS = 24 * 60 * 60_000;

export type DashboardSnapshot = {
  enrolledCourses: number;
  catalogTotal?: number;
  allCourses?: NormalizedCourse[];
  courses: NormalizedCourse[];
  recentSignals: NormalizedSignal[];
  recentActivity: ActivityItem[];
  news: NormalizedNews[];
  savedAt: number;
};

let memorySnapshot: DashboardSnapshot | null | undefined;

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  if (memorySnapshot !== undefined) {
    const snap = memorySnapshot;
    if (snap && Date.now() - snap.savedAt > MAX_AGE_MS) return null;
    return snap;
  }

  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      memorySnapshot = null;
      return null;
    }
    const parsed = JSON.parse(raw) as DashboardSnapshot;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      memorySnapshot = null;
      return null;
    }
    memorySnapshot = parsed;
    return parsed;
  } catch {
    memorySnapshot = null;
    return null;
  }
}

export async function saveDashboardSnapshot(
  data: Omit<DashboardSnapshot, 'savedAt'>,
): Promise<void> {
  const snapshot: DashboardSnapshot = { ...data, savedAt: Date.now() };
  memorySnapshot = snapshot;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export async function clearDashboardSnapshot(): Promise<void> {
  memorySnapshot = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
