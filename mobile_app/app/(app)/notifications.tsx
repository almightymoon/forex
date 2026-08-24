import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { ScreenError } from '../../components/ScreenError';
import { GlassListCard } from '../../components/glass/GlassListCard';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { resolveNotificationRoute } from '../../utils/notificationRouting';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
  read?: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

type FilterKey = 'all' | 'unread' | 'trading' | 'learning' | 'system';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'trading', label: 'Trading' },
  { key: 'learning', label: 'Learning' },
  { key: 'system', label: 'System' },
];

const TRADING_TYPES = new Set(['signal', 'trading_signal']);
const LEARNING_TYPES = new Set([
  'course',
  'course_enrollment',
  'lesson_complete',
  'assignment',
  'live_session',
  'session',
  'certificate',
]);
const SYSTEM_TYPES = new Set(['system', 'payment', 'referral', 'rank_reward_unlocked', 'security', 'commission', 'message']);

function typeMeta(colors: AppColors): Record<string, { icon: AppIconName; color: string; bg: string }> {
  return {
  course: { icon: 'book-open', color: colors.blue, bg: 'rgba(58,173,255,0.12)' },
  course_enrollment: { icon: 'book-open', color: colors.blue, bg: 'rgba(58,173,255,0.12)' },
  lesson_complete: { icon: 'graduation-cap', color: colors.cyan, bg: 'rgba(0,212,255,0.12)' },
  assignment: { icon: 'clipboard', color: colors.blue, bg: 'rgba(58,173,255,0.12)' },
  signal: { icon: 'candlestick', color: colors.success, bg: 'rgba(52,211,153,0.12)' },
  trading_signal: { icon: 'candlestick', color: colors.success, bg: 'rgba(52,211,153,0.12)' },
  payment: { icon: 'wallet', color: colors.gold, bg: 'rgba(255,193,7,0.12)' },
  session: { icon: 'video', color: colors.brandPurple, bg: 'rgba(167,139,250,0.12)' },
  live_session: { icon: 'video', color: colors.brandPurple, bg: 'rgba(167,139,250,0.12)' },
  referral: { icon: 'share', color: colors.gold, bg: 'rgba(255,193,7,0.12)' },
  rank_reward_unlocked: { icon: 'trophy', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  certificate: { icon: 'award', color: '#E879F9', bg: 'rgba(232,121,249,0.12)' },
  security: { icon: 'info', color: colors.sell, bg: 'rgba(255,107,107,0.12)' },
  commission: { icon: 'wallet', color: colors.gold, bg: 'rgba(255,193,7,0.12)' },
  message: { icon: 'community', color: colors.cyan, bg: 'rgba(0,212,255,0.12)' },
  system: { icon: 'info', color: colors.textMuted, bg: colors.surfaceHover },
  };
}

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function matchesFilter(n: Notification, filter: FilterKey) {
  const type = n.type ?? 'system';
  if (filter === 'all') return true;
  if (filter === 'unread') return !n.read;
  if (filter === 'trading') return TRADING_TYPES.has(type);
  if (filter === 'learning') return LEARNING_TYPES.has(type);
  return SYSTEM_TYPES.has(type);
}

function formatRowTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startNotif = new Date(d);
  startNotif.setHours(0, 0, 0, 0);

  if (startNotif.getTime() === startToday.getTime()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (startNotif.getTime() === startYesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function sectionLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startNotif = new Date(d);
  startNotif.setHours(0, 0, 0, 0);

  if (startNotif.getTime() === startToday.getTime()) return 'Today';

  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (startNotif.getTime() === startYesterday.getTime()) return 'Yesterday';

  return 'Earlier';
}

function groupNotifications(items: Notification[]) {
  const order = ['Today', 'Yesterday', 'Earlier'] as const;
  const buckets: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const item of items) {
    buckets[sectionLabel(item.createdAt)].push(item);
  }

  return order
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0);
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('api/notifications/user?limit=50', { cache: 'reload' });
      if (res.ok) {
        const d = await res.json();
        setItems(d.notifications ?? d ?? []);
      } else {
        setError('Unable to load notifications.');
      }
    } catch {
      setError('No connection. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchNotifications();
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`api/notifications/user/${id}/read`, { method: 'PUT' });
    } catch {
      /* optimistic */
    }
  };

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch('api/notifications/user/read-all', { method: 'PUT' });
      toast('All marked as read');
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = (n: Notification) => {
    if (!n.read) void markRead(n._id);
    setSelected(n);
  };

  const openSelectedTarget = () => {
    if (!selected) return;
    const route = resolveNotificationRoute(selected);
    setSelected(null);
    if (route) router.push(route as never);
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const filtered = useMemo(
    () => items.filter((n) => matchesFilter(n, filter)),
    [items, filter],
  );
  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <View style={styles.backIcon}>
              <AppIcon name="chevron-right" size={20} color={colors.text} strokeWidth={2.2} />
            </View>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <Text style={styles.unreadSummary}>{unreadCount} unread</Text>
            ) : (
              <Text style={styles.unreadSummary}>All caught up</Text>
            )}
          </View>
          <Pressable
            style={styles.readAllBtn}
            onPress={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>
              {markingAll ? '…' : 'Read all'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === 'unread'
                ? unreadCount
                : f.key === 'all'
                  ? items.length
                  : items.filter((n) => matchesFilter(n, f.key)).length;

            return (
              <Pressable
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                {count > 0 ? (
                  <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.cyan} style={styles.loader} />
        ) : error ? (
          <ScreenError message={error} onRetry={fetchNotifications} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <AppIcon name="notifications" size={32} color={colors.textDim} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'New alerts about signals, courses, and account updates will appear here.'}
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{group.label}</Text>
                {group.label === 'Today' && unreadCount > 0 ? (
                  <Pressable onPress={markAllRead} disabled={markingAll}>
                    <Text style={styles.markAllLink}>{markingAll ? 'Updating…' : 'Mark all read'}</Text>
                  </Pressable>
                ) : null}
              </View>

              <GlassListCard contentStyle={styles.listCard}>
                {group.items.map((n, index) => {
                  const meta = typeMeta(colors)[n.type ?? 'system'] ?? typeMeta(colors).system;
                  const isLast = index === group.items.length - 1;

                  return (
                    <Pressable
                      key={n._id}
                      style={({ pressed }) => [
                        styles.row,
                        !n.read && styles.rowUnread,
                        pressed && styles.rowPressed,
                        !isLast && styles.rowDivider,
                      ]}
                      onPress={() => handlePress(n)}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                        <AppIcon name={meta.icon} size={18} color={meta.color} strokeWidth={2.1} />
                      </View>

                      <View style={styles.rowBody}>
                        <View style={styles.rowTop}>
                          <Text style={[styles.rowTitle, !n.read && styles.rowTitleUnread]} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text style={styles.rowTime}>{formatRowTime(n.createdAt)}</Text>
                        </View>
                        <Text style={styles.rowMessage} numberOfLines={2}>
                          {n.message}
                        </Text>
                      </View>

                      <View style={styles.rowTrailing}>
                        {!n.read ? <View style={styles.unreadDot} /> : null}
                        <AppIcon name="chevron-right" size={16} color={colors.textDim} strokeWidth={2} />
                      </View>
                    </Pressable>
                  );
                })}
              </GlassListCard>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  <Pressable
                    style={styles.modalClose}
                    onPress={() => setSelected(null)}
                    hitSlop={12}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.modalMeta}>
                  {formatRowTime(selected.createdAt)}
                  {selected.type ? ` · ${selected.type.replace(/_/g, ' ')}` : ''}
                </Text>
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalMessage}>{selected.message}</Text>
                </ScrollView>
                <View style={styles.modalActions}>
                  {resolveNotificationRoute(selected) ? (
                    <Pressable style={styles.modalPrimary} onPress={openSelectedTarget}>
                      <Text style={styles.modalPrimaryText}>Open</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.modalSecondary} onPress={() => setSelected(null)}>
                    <Text style={styles.modalSecondaryText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnDisabled: { opacity: 0.45 },
  readAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'flex-end',
  },
  readAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cyan,
  },
  readAllTextDisabled: {
    color: colors.textDim,
  },
  backIcon: { transform: [{ rotate: '180deg' }] },
  titleBlock: { flex: 1, minWidth: 0 },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  unreadSummary: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderColor: 'rgba(0,212,255,0.35)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.cyan,
    fontWeight: '700',
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(0,212,255,0.18)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipBadgeTextActive: {
    color: colors.cyan,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  loader: { marginTop: 48 },
  section: { marginBottom: 18 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  markAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cyan,
  },
  listCard: { marginHorizontal: 12, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  rowUnread: {
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSilver,
  },
  rowTitleUnread: {
    color: colors.text,
    fontWeight: '800',
  },
  rowTime: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textDim,
    flexShrink: 0,
  },
  rowMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  rowTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
    minWidth: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '72%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modalMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textDim,
    textTransform: 'capitalize',
  },
  modalBody: {
    marginTop: 14,
    marginBottom: 16,
    maxHeight: 280,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSilver,
  },
  modalActions: {
    gap: 10,
  },
  modalPrimary: {
    backgroundColor: colors.cyan,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#041018',
  },
  modalSecondary: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    marginTop: 72,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
}
