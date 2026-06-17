export const colors = {
  background: '#00050A',
  backgroundElevated: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderFocus: 'rgba(0, 127, 255, 0.45)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  primary: '#007FFF',
  primaryEnd: '#00B4FF',
  primaryGlow: 'rgba(0, 127, 255, 0.35)',
  error: '#FF6B6B',
  success: '#4ADE80',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.text,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
};
