import { StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

/** Shared layout tokens for stack / tab screens inside the light app shell */
export const glassScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerSafe: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function stripGlassShell<T extends Record<string, unknown>>(
  style: T,
): Omit<T, 'backgroundColor' | 'borderWidth' | 'borderColor' | 'borderRadius' | 'overflow'> {
  const { backgroundColor, borderWidth, borderColor, borderRadius, overflow, ...rest } = style;
  return rest as Omit<T, 'backgroundColor' | 'borderWidth' | 'borderColor' | 'borderRadius' | 'overflow'>;
}
