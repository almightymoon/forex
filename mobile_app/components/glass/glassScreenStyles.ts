import { StyleSheet } from 'react-native';

/** Shared layout tokens for stack / tab screens inside the glass app shell */
export const glassScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerSafe: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Strip glass shell from a card style — use inside GlassCard contentStyle */
export function stripGlassShell<T extends Record<string, unknown>>(style: T): Omit<T, 'backgroundColor' | 'borderWidth' | 'borderColor' | 'borderRadius' | 'overflow'> {
  const { backgroundColor, borderWidth, borderColor, borderRadius, overflow, ...rest } = style;
  return rest as Omit<T, 'backgroundColor' | 'borderWidth' | 'borderColor' | 'borderRadius' | 'overflow'>;
}
