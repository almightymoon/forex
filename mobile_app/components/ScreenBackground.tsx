import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Variant = 'splash' | 'auth' | 'app';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
};

/** Neobank shell — light or dark with subtle brand glow */
export function ScreenBackground({ children, variant = 'auth', style }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const showBrandGlow = variant === 'splash' || variant === 'auth';

  return (
    <View style={[styles.background, style]}>
      {showBrandGlow ? (
        <LinearGradient
          colors={
            isDark
              ? ['rgba(167,139,250,0.12)', 'rgba(58,173,255,0.06)', 'transparent']
              : ['rgba(255,255,255,0.9)', 'rgba(167,139,250,0.08)', 'transparent']
          }
          locations={[0, 0.35, 1]}
          style={styles.topGlow}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    background: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '42%',
    },
    content: {
      flex: 1,
    },
  });
}
