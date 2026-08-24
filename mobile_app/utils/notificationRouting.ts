/**
 * Map in-app / push notification payloads to Expo Router paths.
 * Prefer explicit data ids, then type, then parse web/app `link` strings.
 */

export type NotificationLike = {
  type?: string | null;
  link?: string | null;
  title?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function pathFromWebOrAppLink(link: string): string | null {
  const raw = link.trim();
  if (!raw) return null;

  // Already a mobile route
  if (raw.startsWith('/(app)/')) return raw;

  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      path = new URL(raw).pathname + new URL(raw).search;
    }
  } catch {
    /* keep raw */
  }

  const lower = path.toLowerCase();

  if (lower.includes('signal')) return '/(app)/signals';
  if (lower.includes('live-session') || lower.includes('tab=live')) return '/(app)/live-sessions';
  if (lower.includes('monthly-fee') || lower.includes('monthly_fee')) return '/(app)/monthly-fee';
  if (lower.includes('rank-reward')) return '/(app)/rank-rewards';
  if (lower.includes('referral') || lower.includes('commission') || lower.includes('earning')) {
    return '/(app)/referrals';
  }
  if (lower.includes('certificate')) return '/(app)/certificates';
  if (lower.includes('assignment')) return '/(app)/assignments';
  if (lower.includes('library')) return '/(app)/library';
  if (lower.includes('community') || lower.includes('chat')) return '/(app)/community';
  if (lower.includes('support')) return '/(app)/support';
  if (lower.includes('subscription') || lower.includes('package')) return '/(app)/subscription';
  if (lower.includes('withdrawal')) return '/(app)/withdrawals';
  if (lower.includes('news')) return '/(app)/news';
  if (lower.includes('notification')) return '/(app)/notifications';

  const courseMatch = path.match(/\/courses?\/([a-f\d]{24})/i) || path.match(/courseId=([a-f\d]{24})/i);
  if (courseMatch?.[1]) return `/(app)/course/${courseMatch[1]}`;

  if (lower.includes('/courses') || lower.includes('tab=courses')) return '/(app)/courses';

  return null;
}

/** Resolve the best mobile route for a notification or push payload. */
export function resolveNotificationRoute(n: NotificationLike): string | null {
  const data = n.data || {};
  const type = asString(n.type)?.toLowerCase() || '';

  const courseId =
    asString(data.courseId) ||
    asString(data.course) ||
    asString(data.course_id);
  const signalId = asString(data.signalId) || asString(data.signal_id);
  const productId = asString(data.productId) || asString(data.product_id);

  if (signalId || type === 'signal' || type === 'trading_signal') {
    return '/(app)/signals';
  }

  if (type === 'live_session' || type === 'session') return '/(app)/live-sessions';

  if (
    type === 'course' ||
    type === 'course_enrollment' ||
    type === 'lesson_complete' ||
    type === 'assignment'
  ) {
    return courseId ? `/(app)/course/${courseId}` : type === 'assignment' ? '/(app)/assignments' : '/(app)/courses';
  }

  if (type === 'certificate') return '/(app)/certificates';
  if (type === 'payment') return '/(app)/monthly-fee';
  if (type === 'referral' || type === 'commission') return '/(app)/referrals';
  if (type === 'rank_reward_unlocked') return '/(app)/rank-rewards';
  if (type === 'message') return '/(app)/community';

  if (productId) return `/(app)/shop/${productId}`;

  // Rank rewards are often stored as type "system"
  const title = `${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (title.includes('rank reward') || data.rankReward || data.rank_reward) {
    return '/(app)/rank-rewards';
  }

  const link = asString(n.link) || asString(data.link);
  if (link) {
    const fromLink = pathFromWebOrAppLink(link);
    if (fromLink) return fromLink;
  }

  return null;
}

/** Same helper for Expo push `data` payloads. */
export function resolvePushDataRoute(data: Record<string, unknown>): string | null {
  return resolveNotificationRoute({
    type: asString(data.type),
    link: asString(data.link),
    title: asString(data.title),
    message: asString(data.message) || asString(data.body),
    data,
  });
}
