import type { UserRole } from './auth';

const MODERATOR_ROLES: UserRole[] = ['developer', 'admin', 'teacher'];

export function isCommunityModerator(role?: string | null): boolean {
  if (!role) return false;
  return MODERATOR_ROLES.includes(role as UserRole);
}

export function canDeleteCommunityMessage(
  userId: string | undefined,
  userRole: string | undefined,
  messageAuthorId: string | undefined,
  messageId?: string,
): boolean {
  if (!userId || !messageAuthorId) return false;
  if (messageId?.startsWith('tmp-')) return false;
  if (String(messageAuthorId) === String(userId)) return true;
  return isCommunityModerator(userRole);
}
