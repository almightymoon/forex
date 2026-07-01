export type CommunityModeratorRole = 'developer' | 'admin' | 'teacher';

const MODERATOR_ROLES = new Set<CommunityModeratorRole>(['developer', 'admin', 'teacher']);

export function isCommunityModerator(role?: string | null): boolean {
  if (!role) return false;
  return MODERATOR_ROLES.has(role as CommunityModeratorRole);
}

export function canDeleteCommunityMessage(
  currentUserId: string | undefined,
  currentUserRole: string | undefined,
  messageAuthorId: string | undefined,
): boolean {
  if (!currentUserId || !messageAuthorId) return false;
  if (messageAuthorId === currentUserId) return true;
  return isCommunityModerator(currentUserRole);
}
