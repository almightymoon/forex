import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import type { ActivityItem } from '../../utils/normalize';
import { GlassCard } from './GlassCard';

type Props = {
  items: ActivityItem[];
  onPress?: () => void;
  onItemPress?: (item: ActivityItem) => void;
};

function formatRelative(iso?: string) {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Now';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch {
    return '';
  }
}

function accentForType(type?: string) {
  switch (type) {
    case 'trading_signal':
      return colors.success;
    case 'live_session':
      return colors.cyan;
    case 'assignment':
      return '#A78BFA';
    default:
      return colors.blue;
  }
}

function ActivityRow({
  item,
  onPress,
}: {
  item: ActivityItem;
  onPress?: () => void;
}) {
  const accent = accentForType(item.type);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {item.timestamp ? <Text style={styles.rowTime}>{formatRelative(item.timestamp)}</Text> : null}
    </Pressable>
  );
}

export function RecentActivityHomeCard({ items, onPress, onItemPress }: Props) {
  const visible = items.slice(0, 2);

  return (
    <Pressable style={({ pressed }) => [styles.flex, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard style={styles.card} contentStyle={styles.inner} radius={20}>
        <Text style={styles.title}>Recent Activity</Text>

        <View style={styles.list}>
          {visible.length > 0 ? (
            visible.map((item, index) => (
              <View key={item.id}>
                <ActivityRow item={item} onPress={() => onItemPress?.(item)} />
                {index < visible.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No recent activity yet</Text>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.92 },
  card: { flex: 1, minWidth: 0 },
  inner: {
    padding: 14,
    minHeight: 208,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  list: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  rowPressed: { opacity: 0.88 },
  accent: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 28,
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  rowMessage: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 15,
  },
  rowTime: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.42)',
    fontVariant: ['tabular-nums'],
    paddingTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  empty: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 17,
  },
});
