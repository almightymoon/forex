import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { gradients, radii } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  progress?: number;
  onPress?: () => void;
  onBrowse?: () => void;
  empty?: boolean;
};

export function ContinueHeroCard({ title, subtitle, progress = 0, onPress, onBrowse, empty }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (empty) {
    return (
      <View style={styles.emptyWrap}>
        <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyGradient}>
          <View style={styles.emptyGlow} />
          <AppIcon name="book-open" size={36} color={colors.cyan} strokeWidth={1.8} />
          <Text style={styles.emptyTitle}>Start your trading education</Text>
          <Text style={styles.emptySub}>Browse courses built for serious forex traders.</Text>
          <Pressable style={styles.ctaWhite} onPress={onBrowse}>
            <Text style={styles.ctaWhiteText}>Browse courses</Text>
            <AppIcon name="chevron-right" size={16} color={colors.indigo} strokeWidth={2.5} />
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  const pct = Math.min(Math.round(progress), 100);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={styles.glowOrb} />
        <View style={styles.topRow}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>Continue learning</Text>
          </View>
          <Text style={styles.pct}>{pct}%</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaHint}>Tap to resume</Text>
          <View style={styles.ctaWhite}>
            <Text style={styles.ctaWhiteText}>Resume</Text>
            <AppIcon name="chevron-right" size={16} color={colors.indigo} strokeWidth={2.5} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: 0,
  },
  pressed: { opacity: 0.92 },
  gradient: {
    padding: 22,
    paddingBottom: 48,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderBlue,
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0,212,255,0.12)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  pct: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHover,
    marginBottom: 16,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ctaWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  ctaWhiteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.indigo,
    letterSpacing: -0.2,
  },
  emptyWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: 0,
  },
  emptyGradient: {
    padding: 28,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderBlue,
  },
  emptyGlow: {
    position: 'absolute',
    top: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,212,255,0.1)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
});
}
