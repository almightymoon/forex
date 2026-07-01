export function courseLevelAccent(level?: string, isDark?: boolean) {
  const key = level?.toLowerCase() ?? '';
  if (key.includes('begin')) {
    return { stripe: ['#3AADFF', '#0253BD'] as [string, string], glow: '#3AADFF' };
  }
  if (key.includes('advanc')) {
    return { stripe: ['#8B5CF6', '#6D28D9'] as [string, string], glow: '#8B5CF6' };
  }
  if (key.includes('inter')) {
    return { stripe: ['#5AC8FA', '#3A7FD4'] as [string, string], glow: '#5AC8FA' };
  }
  return isDark
    ? { stripe: ['#A78BFA', '#8B5CF6'] as [string, string], glow: '#A78BFA' }
    : { stripe: ['#8B5CF6', '#6D28D9'] as [string, string], glow: '#8B5CF6' };
}
