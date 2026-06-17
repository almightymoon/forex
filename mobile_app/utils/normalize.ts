import { API_BASE } from './api';
import { formatInstructor } from './formatInstructor';

export function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['courses', 'data', 'signals', 'items', 'results', 'activities']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

/** Turn relative upload paths into absolute URLs for Image components. */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export interface NormalizedCourse {
  _id: string;
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  instructorImage?: string;
  progress?: number;
  thumbnail?: string;
  lessonCount?: number;
  level?: string;
  rating?: number;
  description?: string;
}

export function normalizeCourse(raw: Record<string, unknown>): NormalizedCourse {
  const teacher = raw.teacher as Record<string, unknown> | undefined;
  const instructor = raw.instructor ?? teacher;
  const instructorImage =
    resolveMediaUrl(teacher?.profileImage as string | undefined) ??
    resolveMediaUrl((instructor as Record<string, unknown> | undefined)?.profileImage as string | undefined);

  return {
    _id: String(raw._id ?? ''),
    title: String(raw.title ?? 'Untitled Course'),
    instructor: instructor as NormalizedCourse['instructor'],
    instructorImage,
    progress: typeof raw.progress === 'number' ? raw.progress : 0,
    thumbnail: resolveMediaUrl(raw.thumbnail as string | undefined),
    lessonCount:
      (raw.lessonCount as number | undefined) ??
      (raw.totalLessons as number | undefined) ??
      (raw.totalVideos as number | undefined),
    level: raw.level as string | undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    description: raw.description as string | undefined,
  };
}

export interface NormalizedSignal {
  _id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  status: 'active' | 'closed' | 'pending';
  pips?: string;
  createdAt?: string;
}

export function normalizeSignal(raw: Record<string, unknown>): NormalizedSignal {
  const type = String(raw.type ?? 'buy').toLowerCase();
  const isBuy = type.includes('buy');
  const target = raw.targetPrice ?? (Array.isArray(raw.targets) ? raw.targets[0] : undefined);

  const rawStatus = String(raw.status ?? 'active');
  const status: NormalizedSignal['status'] =
    rawStatus === 'expired' || rawStatus === 'closed' ? 'closed' : rawStatus === 'pending' ? 'pending' : 'active';

  return {
    _id: String(raw._id ?? ''),
    pair: String(raw.symbol ?? raw.pair ?? '—'),
    direction: isBuy ? 'BUY' : 'SELL',
    entryPrice: String(raw.entryPrice ?? '—'),
    stopLoss: String(raw.stopLoss ?? '—'),
    takeProfit: String(target ?? raw.takeProfit ?? '—'),
    status,
    pips: raw.pips != null ? String(raw.pips) : undefined,
    createdAt: raw.createdAt as string | undefined,
  };
}

export interface ActivityItem {
  id: string;
  title: string;
  message: string;
  timestamp?: string;
  type?: string;
}

export function normalizeActivity(raw: Record<string, unknown>): ActivityItem {
  return {
    id: String(raw.id ?? raw._id ?? Math.random()),
    title: String(raw.title ?? 'Activity'),
    message: String(raw.message ?? ''),
    timestamp: (raw.timestamp ?? raw.createdAt) as string | undefined,
    type: raw.type as string | undefined,
  };
}
