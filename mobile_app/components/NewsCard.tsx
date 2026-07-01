import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CachedImage } from './CachedImage';
import { AppIcon } from './AppIcon';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { NormalizedNews } from '../utils/normalize';
import { GlassCard } from './GlassCard';

type Props = {
  item: NormalizedNews;
  compact?: boolean;
  onPress?: () => void;
};

function formatTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function NewsCard({ item, compact, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const inner = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {item.thumbnail ? (
        <CachedImage source={{ uri: item.thumbnail }} style={[styles.thumb, compact && styles.thumbCompact]} contentFit="cover" />
      ) : (
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <AppIcon name="file-text" size={compact ? 16 : 18} color={colors.textMuted} strokeWidth={2} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.sourcePill}>
            <Text style={styles.source}>{item.source}</Text>
          </View>
          <Text style={styles.time}>{formatTime(item.publishedAt)}</Text>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 2 : 3}>
          {item.title}
        </Text>
        {!compact && item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
        ) : null}
      </View>
      <AppIcon name="chevron-right" size={16} color={colors.textDim} strokeWidth={2} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [pressed && styles.pressed]}
        onPress={onPress}
      >
        <GlassCard contentStyle={compact ? styles.cardCompact : styles.cardInner} radius={compact ? 14 : 18}>
          {inner}
        </GlassCard>
      </Pressable>
    );
  }

  return (
    <GlassCard contentStyle={compact ? styles.cardCompact : styles.cardInner} radius={compact ? 14 : 18}>
      {inner}
    </GlassCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  cardInner: { padding: 14 },
  cardCompact: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowCompact: { gap: 10 },
  pressed: { opacity: 0.92 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbCompact: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  body: { flex: 1, minWidth: 0, gap: 5 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  source: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 11,
    color: colors.textDim,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
}
