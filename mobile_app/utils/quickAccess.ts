import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppIconName } from '../components/AppIcon';
import { colors } from '../constants/theme';
import type { ActivityItem } from './normalize';

export type QuickAccessIcon = AppIconName;

export type QuickAccessItem = {
  id: string;
  icon: QuickAccessIcon;
  label: string;
  color: string;
  route: string;
};

const STORAGE_KEY = 'quick_access_usage';

const DEFAULT_IDS = ['live-sessions', 'signals', 'community', 'certificates'] as const;

function defaultOrder(id: string): number {
  const index = DEFAULT_IDS.indexOf(id as (typeof DEFAULT_IDS)[number]);
  return index === -1 ? 999 : index;
}

export const QUICK_ACCESS_CATALOG: QuickAccessItem[] = [
  { id: 'live-sessions', icon: 'video', label: 'Live Sessions', color: colors.cyan, route: '/(app)/live-sessions' },
  { id: 'signals', icon: 'candlestick', label: 'Signals', color: colors.success, route: '/(app)/signals' },
  { id: 'community', icon: 'users', label: 'Community', color: colors.blue, route: '/(app)/community' },
  { id: 'certificates', icon: 'award', label: 'Certificates', color: colors.cyan, route: '/(app)/certificates' },
  { id: 'trading-view', icon: 'live-charts', label: 'Live Charts', color: colors.gold, route: '/(app)/trading-view' },
  { id: 'progress', icon: 'bar-chart', label: 'My Progress', color: colors.blue, route: '/(app)/progress' },
  { id: 'referrals', icon: 'share', label: 'Referrals', color: colors.gold, route: '/(app)/referrals' },
  { id: 'rank-rewards', icon: 'trophy', label: 'Rank Rewards', color: colors.gold, route: '/(app)/rank-rewards' },
  { id: 'assignments', icon: 'clipboard', label: 'Assignments', color: colors.cyan, route: '/(app)/assignments' },
  { id: 'subscription', icon: 'layers', label: 'Subscription', color: colors.blue, route: '/(app)/subscription' },
  { id: 'support', icon: 'headphones', label: 'Support', color: colors.blue, route: '/(app)/support' },
];

const CATALOG_BY_ID = new Map(QUICK_ACCESS_CATALOG.map((item) => [item.id, item]));

const ACTIVITY_TO_QUICK_ACCESS: Record<string, string> = {
  trading_signal: 'signals',
  live_session: 'live-sessions',
  course_enrollment: 'progress',
  lesson_complete: 'progress',
  certificate: 'certificates',
  payment: 'subscription',
  referral: 'referrals',
};

const ROUTE_TO_QUICK_ACCESS: Record<string, string> = Object.fromEntries(
  QUICK_ACCESS_CATALOG.map((item) => [item.route, item.id]),
);

async function readUsage(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

async function writeUsage(usage: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export async function recordQuickAccessUse(id: string): Promise<void> {
  const usage = await readUsage();
  usage[id] = (usage[id] ?? 0) + 1;
  await writeUsage(usage);
}

/** Track visits from tabs, activity cards, etc. */
export async function recordQuickAccessRoute(route: string): Promise<void> {
  const id = ROUTE_TO_QUICK_ACCESS[route];
  if (id) await recordQuickAccessUse(id);
}

type RankContext = {
  recentActivity?: ActivityItem[];
  enrolledCourses?: number;
  totalSignals?: number;
  certificates?: number;
};

function scoreItems(usage: Record<string, number>, context?: RankContext): Map<string, number> {
  const scores = new Map<string, number>();

  for (const item of QUICK_ACCESS_CATALOG) {
    scores.set(item.id, usage[item.id] ?? 0);
  }

  for (const activity of context?.recentActivity ?? []) {
    const id = activity.type ? ACTIVITY_TO_QUICK_ACCESS[activity.type] : undefined;
    if (id) scores.set(id, (scores.get(id) ?? 0) + 3);
  }

  if ((context?.enrolledCourses ?? 0) > 0) {
    scores.set('progress', (scores.get('progress') ?? 0) + 2);
  }
  if ((context?.totalSignals ?? 0) > 0) {
    scores.set('signals', (scores.get('signals') ?? 0) + 2);
  }
  if ((context?.certificates ?? 0) > 0) {
    scores.set('certificates', (scores.get('certificates') ?? 0) + 2);
  }

  return scores;
}

export async function getTopQuickAccessItems(
  limit = 4,
  context?: RankContext,
): Promise<QuickAccessItem[]> {
  const usage = await readUsage();
  const scores = scoreItems(usage, context);

  const ranked = [...QUICK_ACCESS_CATALOG].sort((a, b) => {
    const diff = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
    if (diff !== 0) return diff;
    return defaultOrder(a.id) - defaultOrder(b.id);
  });

  const hasUsage = ranked.some((item) => (scores.get(item.id) ?? 0) > 0);
  if (!hasUsage) {
    return DEFAULT_IDS.map((id) => CATALOG_BY_ID.get(id)!);
  }

  return ranked.slice(0, limit);
}
