/**
 * FX Navigators brand palette — derived from the FN compass logo:
 * deep black, electric blue, cyan north-arrow, indigo depth, metallic silver.
 */
export const colors = {
  black: '#020408',
  background: '#040818',
  backgroundElevated: '#0a1020',
  surface: 'rgba(12, 20, 40, 0.88)',
  surfaceSolid: '#0c1428',
  surfaceHover: 'rgba(255, 255, 255, 0.05)',

  border: 'rgba(255, 255, 255, 0.08)',
  borderCyan: 'rgba(0, 212, 255, 0.22)',
  borderBlue: 'rgba(58, 173, 255, 0.25)',

  text: '#F1F5F9',
  textSilver: 'rgba(255, 255, 255, 0.78)',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textMuted: 'rgba(255, 255, 255, 0.42)',
  textDim: 'rgba(255, 255, 255, 0.32)',

  /** Logo "N" gradient — electric blue */
  blue: '#3AADFF',
  /** Logo north arrow — cyan glow */
  cyan: '#00D4FF',
  /** Logo deep indigo */
  indigo: '#003D99',
  indigoDeep: '#0055CC',

  /** Greeting name accent */
  gold: '#FFC107',

  success: '#34D399',
  error: '#F87171',
  sell: '#FF6B6B',

  /** Legacy aliases */
  primary: '#3AADFF',
  primaryEnd: '#00D4FF',
  primaryGlow: 'rgba(0, 212, 255, 0.35)',
};

export const gradients = {
  /** Hero card — logo blue → indigo */
  hero: ['#0055CC', '#003D99', '#0a1840'] as const,
  /** Primary button — logo electric */
  button: ['#0060E6', '#3AADFF'] as const,
  /** Cyan accent shimmer */
  accent: ['#00D4FF', '#3AADFF'] as const,
  /** Metallic silver hint */
  silver: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)'] as const,
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
  xl: 20,
  full: 999,
};

export const typography = {
  greeting: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  mono: {
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
};
