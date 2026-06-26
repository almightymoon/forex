import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../AppIcon';
import type { ActivityItem } from '../../../utils/normalize';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  items: ActivityItem[];
  onSeeAll?: () => void;
  onItemPress?: (item: ActivityItem) => void;
};

function formatWhen(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date}, ${time}`;
  } catch {
    return '';
  }
}

function iconForType(type?: string) {
  switch (type) {
    case 'trading_signal':
      return 'candlestick' as const;
    case 'live_session':
      return 'radio' as const;
    case 'course_progress':
      return 'book-open' as const;
    case 'assignment':
      return 'clipboard' as const;
    case 'notification':
      return 'notifications' as const;
    default:
      return 'activity' as const;
  }
}

function badgeForType(type?: string) {
  switch (type) {
    case 'trading_signal':
      return { label: 'Signal', tone: 'success' as const };
    case 'live_session':
      return { label: 'Live', tone: 'success' as const };
    case 'course_progress':
      return { label: 'Progress', tone: 'success' as const };
    default:
      return null;
  }
}

function ActivityRow({
  item,
  onPress,
  styles,
  neo,
}: {
  item: ActivityItem;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
  neo: ReturnType<typeof import('../../../constants/theme').createNeo>;
}) {
  const badge = badgeForType(item.type);
  const when = formatWhen(item.timestamp);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <AppIcon name={iconForType(item.type)} size={20} color={neo.ink} strokeWidth={1.9} />
      </View>

      <View style={styles.body}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {when || item.message}
        </Text>
      </View>

      <View style={styles.trailing}>
        {badge ? (
          <View style={[styles.badge, badge.tone === 'success' && styles.badgeSuccess]}>
            <Text style={[styles.badgeText, badge.tone === 'success' && styles.badgeTextSuccess]}>
              +{badge.label}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function NeoActivityList({ items, onSeeAll, onItemPress }: Props) {
  const { neo, isDark } = useTheme();
  const styles = useMemo(() => createStyles(neo, isDark), [neo, isDark]);
  const visible = items.slice(0, 4);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Activity</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.link}>See all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {visible.length > 0 ? (
          visible.map((item, index) => (
            <View key={`${item.id}-${index}`}>
              <ActivityRow
                item={item}
                onPress={() => onItemPress?.(item)}
                styles={styles}
                neo={neo}
              />
              {index < visible.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recent activity yet</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(
  neo: ReturnType<typeof import('../../../constants/theme').createNeo>,
  isDark: boolean,
) {
  return StyleSheet.create({
    wrap: { marginBottom: 12 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: neo.ink,
      letterSpacing: -0.4,
    },
    link: {
      fontSize: 14,
      fontWeight: '700',
      color: neo.inkMuted,
    },
    list: {
      backgroundColor: neo.card,
      borderRadius: neo.radiusLg,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: neo.border,
      shadowColor: neo.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: { opacity: 0.85 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: neo.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDark ? 1 : 0,
      borderColor: neo.border,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: neo.ink,
      letterSpacing: -0.2,
    },
    sub: {
      fontSize: 12,
      fontWeight: '500',
      color: neo.inkMuted,
    },
    trailing: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: neo.bg,
    },
    badgeSuccess: {
      backgroundColor: neo.successBg,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: neo.inkMuted,
    },
    badgeTextSuccess: {
      color: neo.success,
    },
    divider: {
      height: 1,
      backgroundColor: neo.border,
      marginLeft: 72,
    },
    empty: {
      padding: 28,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '500',
      color: neo.inkMuted,
    },
  });
}
