import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
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
  const inner = (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={[styles.thumb, compact && styles.thumbCompact]} />
      ) : (
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <AppIcon name="file-text" size={compact ? 16 : 18} color={colors.cyan} strokeWidth={2} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.source}>{item.source}</Text>
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
        <GlassCard contentStyle={compact ? styles.cardCompact : styles.cardInner} radius={compact ? 14 : 16}>
          {inner}
        </GlassCard>
      </Pressable>
    );
  }

  return (
    <GlassCard contentStyle={compact ? styles.cardCompact : styles.cardInner} radius={compact ? 14 : 16}>
      {inner}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  thumbCompact: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,212,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  body: { flex: 1, minWidth: 0, gap: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  source: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  time: {
    fontSize: 11,
    color: colors.textDim,
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
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
