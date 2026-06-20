import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../constants/theme';
import type { NormalizedNews } from '../../utils/normalize';
import { GlassCard } from './GlassCard';

const THUMB_SIZE = 72;
const THUMB_RADIUS = 14;

type Props = {
  item: NormalizedNews;
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

export function HomeNewsCard({ item, onPress }: Props) {
  const hasThumb = Boolean(item.thumbnail);

  return (
    <Pressable
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
      onPress={onPress}
    >
      <GlassCard contentStyle={styles.inner} radius={20}>
        <View style={styles.thumb}>
          {hasThumb ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <AppIcon name="file-text" size={24} color={colors.cyan} strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.source} numberOfLines={1}>
              {item.source}
            </Text>
            <Text style={styles.time}>{formatTime(item.publishedAt)}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.92,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    padding: 12,
    minHeight: THUMB_SIZE + 24,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flexShrink: 0,
    alignSelf: 'center',
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,255,0.1)',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  source: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.42)',
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 19,
    marginTop: 6,
  },
});
