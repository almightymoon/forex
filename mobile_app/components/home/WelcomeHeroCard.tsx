import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from './GlassCard';

type Props = {
  firstName: string;
  enrolledCount: number;
  activeSignals: number;
  subtitle?: string;
  actionLabel?: string;
  onPrimaryAction?: () => void;
};

function padStat(n: number) {
  return String(n).padStart(2, '0');
}

function HeroLightSource() {
  const { colors, isDark } = useTheme();
  const lightStyles = useMemo(() => createLightStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={lightStyles.wrap} pointerEvents="none">
      <View style={lightStyles.halo} />
      <View style={lightStyles.core} />
    </View>
  );
}

function createLightStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: '50%',
      right: -8,
      width: 132,
      height: 132,
      marginTop: -66,
      alignItems: 'center',
      justifyContent: 'center',
    },
    halo: {
      position: 'absolute',
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: `${colors.brandPurple}${isDark ? '28' : '1E'}`,
    },
    core: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: `${colors.brandPurple}${isDark ? '40' : '30'}`,
    },
  });
}

export function WelcomeHeroCard({
  firstName,
  enrolledCount,
  activeSignals,
  subtitle = 'Start your learning journey today',
  actionLabel = 'Browse Courses',
  onPrimaryAction,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GlassCard
      style={styles.wrap}
      contentStyle={styles.inner}
      backdrop={<HeroLightSource />}
      radius={26}
      prominent
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.welcome}>Welcome Back,</Text>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onPrimaryAction}
          >
            <Text style={styles.btnText}>{actionLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.statsOrb}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{enrolledCount}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, styles.statValueAccent]}>{padStat(activeSignals)}</Text>
            <Text style={styles.statLabel}>Signals</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 24,
    },
    inner: {
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 20,
      gap: 12,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    welcome: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSilver,
      marginBottom: 2,
    },
    name: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.brandPurple,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    sub: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSilver,
      lineHeight: 18,
      marginBottom: 14,
    },
    btn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.brandPurple,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    btnPressed: { opacity: 0.9 },
    btnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statsOrb: {
      width: 96,
      flexShrink: 0,
      zIndex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    statBlock: {
      alignItems: 'center',
    },
    statDivider: {
      width: 28,
      height: 1,
      backgroundColor: colors.surfaceHover,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 26,
      fontVariant: ['tabular-nums'],
    },
    statValueAccent: {
      color: colors.brandPurple,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSilver,
      textAlign: 'center',
    },
  });
}
