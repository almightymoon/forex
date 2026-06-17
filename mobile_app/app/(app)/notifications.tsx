import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { apiFetch } from '../../utils/api';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  course: { icon: 'book-outline', color: '#3AADFF' },
  course_enrollment: { icon: 'book-outline', color: '#3AADFF' },
  lesson_complete: { icon: 'checkmark-circle-outline', color: '#3AADFF' },
  signal: { icon: 'trending-up-outline', color: '#4ADE80' },
  trading_signal: { icon: 'trending-up-outline', color: '#4ADE80' },
  payment: { icon: 'wallet-outline', color: '#FFC107' },
  session: { icon: 'videocam-outline', color: '#A78BFA' },
  live_session: { icon: 'videocam-outline', color: '#A78BFA' },
  referral: { icon: 'people-outline', color: '#FFC107' },
  rank_reward_unlocked: { icon: 'trophy-outline', color: '#F59E0B' },
  certificate: { icon: 'ribbon-outline', color: '#E879F9' },
  system: { icon: 'information-circle-outline', color: 'rgba(255,255,255,0.4)' },
};

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

/** Navigate to the relevant screen for a notification type */
function resolveRoute(n: Notification): string | null {
  const t = n.type ?? '';
  if (t === 'trading_signal' || t === 'signal') return '/(app)/signals';
  if (t === 'live_session' || t === 'session') return '/(app)/live-sessions';
  if (t === 'course' || t === 'course_enrollment' || t === 'lesson_complete') return '/(app)/courses';
  if (t === 'certificate') return '/(app)/certificates';
  if (t === 'payment') return '/(app)/subscription';
  if (t === 'referral') return '/(app)/referrals';
  if (t === 'rank_reward_unlocked') return '/(app)/rank-rewards';
  return null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('api/notifications/user');
      if (res.ok) {
        const d = await res.json();
        setItems(d.notifications ?? d ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    try {
      await apiFetch(`api/notifications/user/${id}/read`, { method: 'PUT' });
    } catch { /* optimistic — ignore */ }
  };

  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch('api/notifications/user/read-all', { method: 'PUT' });
      toast('All notifications marked as read');
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = (n: Notification) => {
    if (!n.read) markRead(n._id);
    const route = resolveRoute(n);
    if (route) router.push(route as any);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
            )}
          </View>
          {unreadCount > 0 ? (
            <Pressable style={styles.markAllBtn} onPress={markAllRead} disabled={markingAll}>
              <Text style={styles.markAllText}>{markingAll ? '…' : 'Mark all read'}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up. We'll notify you when something new happens.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((n) => {
              const iconInfo = TYPE_ICONS[n.type ?? 'system'] ?? TYPE_ICONS.system;
              const tappable = !!resolveRoute(n);
              return (
                <Pressable
                  key={n._id}
                  style={[styles.notifItem, !n.read && styles.notifUnread]}
                  onPress={() => handlePress(n)}
                  android_ripple={{ color: 'rgba(58,173,255,0.1)' }}
                >
                  <View style={[styles.notifIcon, { backgroundColor: `${iconInfo.color}18` }]}>
                    <Ionicons name={iconInfo.icon} size={20} color={iconInfo.color} />
                  </View>
                  <View style={styles.notifText}>
                    <View style={styles.notifTitleRow}>
                      <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={2}>{n.message}</Text>
                    <View style={styles.notifMeta}>
                      <Text style={styles.notifDate}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                      {tappable && (
                        <Text style={styles.tapHint}>
                          <Ionicons name="chevron-forward" size={11} color="#3AADFF" />
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#00050A' },
  headerSafe: { backgroundColor: 'rgba(0,5,10,0.97)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  back: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  badge: { backgroundColor: 'rgba(58,173,255,0.2)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#3AADFF' },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontSize: 12, fontWeight: '700', color: '#3AADFF' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  list: { gap: 10 },
  notifItem: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14, alignItems: 'flex-start' },
  notifUnread: { borderColor: 'rgba(58,173,255,0.25)', backgroundColor: 'rgba(0,30,70,0.9)' },
  notifIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifText: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#3AADFF', flexShrink: 0 },
  notifMessage: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  notifDate: { fontSize: 11.5, color: 'rgba(255,255,255,0.25)' },
  tapHint: { fontSize: 11, color: '#3AADFF' },
  empty: { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
});
