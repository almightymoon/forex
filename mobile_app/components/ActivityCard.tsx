import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { AppIcon } from './AppIcon';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  message: string;
  timestamp?: string;
  onPress?: () => void;
};

function formatDate(iso?: string) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function ActivityCard({ title, message, timestamp, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const inner = (
    <>
      <View style={styles.iconWrap}>
        <AppIcon name="activity" size={19} color={colors.brandBlue} strokeWidth={2.2} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        {timestamp ? <Text style={styles.date}>{formatDate(timestamp)}</Text> : null}
      </View>
      <AppIcon name="chevron-right" size={18} color={colors.textMuted} strokeWidth={2} />
    </>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [pressed && styles.pressed]} onPress={onPress}>
        <GlassCard contentStyle={styles.cardInner} radius={16}>
          {inner}
        </GlassCard>
      </Pressable>
    );
  }

  return (
    <GlassCard contentStyle={styles.cardInner} radius={16}>
      {inner}
    </GlassCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,96,230,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.25)',
  },
  content: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  date: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
});
}
