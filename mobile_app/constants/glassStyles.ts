/** Semi-transparent shell tokens — cards show the app-level blur through these surfaces */
export const glassShell = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.11)' as const,
};

export const glassShellStrong = {
  backgroundColor: 'rgba(255,255,255,0.06)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)' as const,
};

export const glassScreenBg = {
  backgroundColor: 'transparent' as const,
};
