/**
 * FX Navigators — Neobank design system (light + dark).
 */

export const lightColors = {
  black: '#0F0F0F',
  background: '#F4F4F5',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSolid: '#FFFFFF',
  surfaceHover: 'rgba(0, 0, 0, 0.04)',
  surfaceInset: '#FAFAFA',

  border: '#ECECEE',
  borderCyan: 'rgba(167, 139, 250, 0.35)',
  borderBlue: 'rgba(58, 173, 255, 0.18)',

  text: '#0F0F0F',
  textOnDark: '#FFFFFF',
  textSilver: '#3A3A3C',
  textSecondary: '#636366',
  textMuted: '#8E8E93',
  textDim: '#AEAEB2',

  blue: '#3AADFF',
  cyan: '#00D4FF',
  indigo: '#003D99',
  indigoDeep: '#0055CC',
  /** Logo purple */
  violet: '#8B5CF6',
  brandBlue: '#3AADFF',
  brandBlueDeep: '#0253BD',
  brandPurple: '#8B5CF6',
  brandPurpleDeep: '#6D28D9',

  lime: '#D4FF58',
  limeDark: '#B8E63C',
  gold: '#FFC107',

  success: '#34C759',
  error: '#FF3B30',
  sell: '#FF6B6B',

  primary: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryEnd: '#7C3AED',
  primaryGlow: 'rgba(139, 92, 246, 0.28)',
  primaryForeground: '#FFFFFF',

  statusBar: 'dark' as 'light' | 'dark',
  blurTint: 'light' as 'light' | 'dark',
  headerGradient: ['#0F0F0F', '#1C1C1E', '#2C2C2E'] as readonly string[],
  scrimLight: 'rgba(244,244,245,0.92)',
  scrimDark: 'rgba(0,0,0,0.55)',
};

export const darkColors = {
  black: '#000000',
  background: '#0B0B0D',
  backgroundElevated: '#161618',
  surface: '#1C1C1E',
  surfaceSolid: '#1C1C1E',
  surfaceHover: 'rgba(255, 255, 255, 0.07)',
  surfaceInset: '#141416',

  border: 'rgba(255, 255, 255, 0.09)',
  borderCyan: 'rgba(196, 181, 253, 0.35)',
  borderBlue: 'rgba(90, 200, 250, 0.22)',

  text: '#F5F5F7',
  textOnDark: '#FFFFFF',
  textSilver: '#E5E5EA',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  textDim: '#636366',

  blue: '#5AC8FA',
  cyan: '#64D2FF',
  indigo: '#5E9EFF',
  indigoDeep: '#3A7FD4',
  /** Logo purple */
  violet: '#A78BFA',
  brandBlue: '#5AC8FA',
  brandBlueDeep: '#3A7FD4',
  brandPurple: '#A78BFA',
  brandPurpleDeep: '#8B5CF6',

  lime: '#D4FF58',
  limeDark: '#B8E63C',
  gold: '#FFD60A',

  success: '#30D158',
  error: '#FF453A',
  sell: '#FF6961',

  primary: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryEnd: '#7C3AED',
  primaryGlow: 'rgba(139, 92, 246, 0.24)',
  primaryForeground: '#FFFFFF',

  statusBar: 'light' as 'light' | 'dark',
  blurTint: 'dark' as 'light' | 'dark',
  headerGradient: ['#0B0B0D', '#141416', '#1C1C1E'] as readonly string[],
  scrimLight: 'rgba(0,0,0,0.72)',
  scrimDark: 'rgba(0,0,0,0.85)',
};

export type AppColors = typeof lightColors;

/** @deprecated Prefer useTheme().colors — kept for non-React modules */
export const colors: AppColors = lightColors;

export function getColorsForScheme(isDark: boolean): AppColors {
  return (isDark ? darkColors : lightColors) as AppColors;
}

export const gradients = {
  hero: ['#8B5CF6', '#7C3AED', '#6D28D9'] as const,
  button: ['#8B5CF6', '#6D28D9'] as const,
  accent: ['#8B5CF6', '#3AADFF'] as const,
  silver: ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.01)'] as const,
};

export const darkGradients = {
  hero: ['#A78BFA', '#8B5CF6', '#6D28D9'] as const,
  button: ['#A78BFA', '#8B5CF6'] as const,
  accent: ['#A78BFA', '#5AC8FA'] as const,
  silver: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as const,
};

export function getGradients(isDark: boolean) {
  return isDark ? darkGradients : gradients;
}

/** Logo blue → purple gradient used for accents */
export function brandGradient(isDark: boolean): readonly [string, string] {
  return isDark
    ? ([darkColors.brandPurple, darkColors.brandBlue] as const)
    : ([lightColors.brandPurple, lightColors.brandBlue] as const);
}

export function brandGradientDeep(isDark: boolean): readonly [string, string] {
  return isDark
    ? ([darkColors.brandPurpleDeep, darkColors.brandBlueDeep] as const)
    : ([lightColors.brandPurpleDeep, lightColors.brandBlueDeep] as const);
}

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
  xl: 20,
  xxl: 28,
  full: 999,
};

export function createTypography(c: AppColors) {
  return {
    greeting: {
      fontSize: 30,
      fontWeight: '800' as const,
      color: c.text,
      letterSpacing: -0.8,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.textMuted,
      letterSpacing: 0.2,
    },
    mono: {
      fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    },
  };
}

export const typography = createTypography(lightColors);

export function createNeo(c: AppColors, isDark = false) {
  return {
    bg: c.background,
    card: c.surface,
    ink: c.text,
    inkMuted: c.textMuted,
    inkSoft: c.textDim,
    border: c.border,
    lime: c.lime,
    limeDark: c.limeDark,
    limePattern: isDark ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.06)',
    black: isDark ? '#0F0F0F' : c.black,
    success: c.success,
    successBg: isDark ? 'rgba(48,209,88,0.16)' : '#E8F9ED',
    shadow: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.06)',
    radiusLg: radii.xxl,
    radiusMd: radii.xl,
    radiusSm: radii.lg,
  } as const;
}

/** Alias used by neo home components */
export const neo = createNeo(lightColors);

export function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good evening';
}
