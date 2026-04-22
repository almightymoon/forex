export const NOTIFICATION_TYPES = [
  'assignment',
  'course',
  'message',
  'system',
  'payment',
  'security',
  'referral',
  'commission',
  'live_session'
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

