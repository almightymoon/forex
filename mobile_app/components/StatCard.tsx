import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../constants/theme';
import { lightColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassCard';

type Props = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  highlighted?: boolean;
  subtitle?: string;
  compact?: boolean;
};

export function StatCard({ label, value, icon, accent = lightColors.brandBlue, highlighted, subtitle, compact }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const highlightStyle = highlighted
    ? { borderColor: `${accent}55`, shadowColor: accent }
    : undefined;

  if (compact) {
    return (
      <GlassCard
        style={[styles.flex, highlighted && styles.cardHighlighted, highlightStyle]}
        contentStyle={styles.compactInner}
        radius={14}
      >
        <View style={[styles.compactIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
        <Text style={styles.compactNumber}>{value}</Text>
        <Text style={styles.compactLabel}>{label}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      style={[styles.flex, highlighted && styles.cardHighlighted, highlightStyle]}
      contentStyle={styles.cardInner}
      radius={16}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>{icon}</View>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </GlassCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  cardInner: {
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardHighlighted: {
    elevation: 4,
    shadowOpacity: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  compactInner: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  compactIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  compactLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
}
