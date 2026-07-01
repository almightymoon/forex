import type { AppColors } from '../constants/theme';
import { brandGradientDeep, getColorsForScheme } from '../constants/theme';

/** Shared solid primary button tokens for StyleSheet factories */
export function primaryButtonStyle(colors: AppColors) {
  return {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  } as const;
}

export function primaryButtonGradient(isDark: boolean): [string, string, ...string[]] {
  const [start, end] = brandGradientDeep(isDark);
  return [start, end];
}

export function brandAccentColor(isDark: boolean): string {
  return getColorsForScheme(isDark).brandBlue;
}
