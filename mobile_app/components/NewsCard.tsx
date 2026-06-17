import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import type { NormalizedNews } from '../utils/normalize';

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
  const open = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (item.url) void Linking.openURL(item.url);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, pressed && styles.pressed]}
      onPress={open}
    >
      <View style={styles.iconWrap}>
        <AppIcon name="file-text" size={compact ? 16 : 18} color={colors.cyan} strokeWidth={2} />
      </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 20, 40, 0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompact: {
    padding: 12,
    borderRadius: 14,
  },
  pressed: { opacity: 0.92 },
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
