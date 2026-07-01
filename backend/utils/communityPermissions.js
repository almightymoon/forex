function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

function getEffectiveRole(user) {
  if (!user) return '';
  return normalizeRole(user.realRole || user.role);
}

const MODERATOR_ROLES = new Set(['admin', 'teacher', 'developer']);

function canModerateCommunity(user) {
  return MODERATOR_ROLES.has(getEffectiveRole(user));
}

function canDeleteCommunityMessage(user, messageAuthorId) {
  if (!user) return false;
  const authorId = String(messageAuthorId);
  const userId = String(user.id || user._id);
  if (authorId === userId) return true;
  return canModerateCommunity(user);
}

module.exports = {
  canModerateCommunity,
  canDeleteCommunityMessage,
};
