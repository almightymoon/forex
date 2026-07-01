import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { ActivityItem } from '../../utils/normalize';
import { GlassCard } from './GlassCard';

type Props = {
  items: ActivityItem[];
  onSeeAll?: () => void;
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

function accentForType(type: string | undefined, colors: AppColors) {
  switch (type) {
    case 'trading_signal':
      return colors.brandPurple;
    case 'live_session':
      return colors.brandBlue;
    case 'assignment':
      return colors.brandPurple;
    default:
      return colors.brandBlue;
  }
}

function ActivityRow({
  item,
  onPress,
}: {
  item: ActivityItem;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = accentForType(item.type, colors);
  const when = formatRelative(item.timestamp);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityLabel={`${item.title}. ${item.message}${when ? `. ${when} ago` : ''}`}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {when ? <Text style={styles.rowTime}>{when}</Text> : null}
    </Pressable>
  );
}

export function RecentActivityHomeCard({ items, onSeeAll, onItemPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const visible = items.slice(0, 2);

  return (
    <View style={styles.flex}>
      <GlassCard style={styles.card} contentStyle={styles.inner} radius={20}>
        <View style={styles.header}>
          <Text style={styles.title}>Recent Activity</Text>
          {onSeeAll ? (
            <Pressable onPress={onSeeAll} hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.list}>
          {visible.length > 0 ? (
            visible.map((item, index) => (
              <View key={`${item.id}-${index}`}>
                <ActivityRow item={item} onPress={() => onItemPress?.(item)} />
                {index < visible.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No recent activity yet</Text>
          )}
        </View>
      </GlassCard>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    card: { flex: 1, minWidth: 0 },
    inner: {
      padding: 14,
      minHeight: 208,
      justifyContent: 'flex-start',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
    },
    seeAll: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPurple,
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
      color: colors.textSecondary,
      lineHeight: 15,
    },
    rowTime: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
      paddingTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.surfaceHover,
      marginVertical: 4,
    },
    empty: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 17,
    },
  });
}
