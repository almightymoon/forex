import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { ExploreScreenHeader } from '../../components/explore/ExploreScreenHeader';
import { createExploreChipStyles } from '../../components/explore/exploreStyles';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';
import { formatInstructor } from '../../utils/formatInstructor';
import {
  formatSessionDate,
  formatSessionTime,
  parseSessionsResponse,
  type LiveSessionItem,
} from '../../utils/liveSessions';

function formatDuration(mins?: number) {
  if (!mins) return '';
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
  return `${mins}m`;
}

const STATUS_CONFIG = (colors: AppColors): Record<string, { label: string; color: string; bg: string }> => ({
  live: { label: '● LIVE', color: '#FFFFFF', bg: colors.brandPurple },
  scheduled: { label: 'Scheduled', color: colors.text, bg: colors.surfaceHover },
  completed: { label: 'Completed', color: colors.textDim, bg: colors.surfaceHover },
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceHover },
  rescheduled: { label: 'Rescheduled', color: colors.textSecondary, bg: colors.surfaceHover },
});

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function LiveSessionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await apiFetch('api/sessions');
      if (res.ok) {
        const raw = await res.json();
        setSessions(parseSessionsResponse(raw));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchSessions(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSessions(); };

  const bookSession = async (sessionId: string) => {
    if (bookingId) return;
    setBookingId(sessionId);
    try {
      const res = await apiFetch(`api/sessions/${sessionId}/book`, { method: 'POST' });
      if (res.ok) {
        toast('Spot reserved!');
        fetchSessions();
      } else {
        const d = await res.json().catch(() => ({}));
        if ((d as { code?: string }).code === 'PACKAGE_REQUIRED') {
          Alert.alert(
            'Package required',
            'This session is not included in your plan. Upgrade to reserve your spot.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'View plans', onPress: () => router.push('/subscription-upgrade') },
            ],
          );
        } else {
          const msg = (d as { message?: string; error?: string }).message ?? (d as { error?: string }).error ?? 'Could not reserve. Please try again.';
          Alert.alert('Reservation failed', msg);
        }
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally { setBookingId(null); }
  };

  const cancelSession = async (sessionId: string) => {
    if (cancellingId) return;
    Alert.alert('Cancel reservation', 'Release your spot for this session?', [
      { text: 'Keep spot', style: 'cancel' },
      {
        text: 'Cancel reservation', style: 'destructive',
        onPress: async () => {
          setCancellingId(sessionId);
          try {
            const res = await apiFetch(`api/sessions/${sessionId}/cancel`, { method: 'POST' });
            if (res.ok) {
              toast('Reservation cancelled.');
              fetchSessions();
            } else {
              const d = await res.json().catch(() => ({}));
              Alert.alert('Failed', (d as { message?: string; error?: string }).message ?? 'Could not cancel. Try again.');
            }
          } catch {
            Alert.alert('Error', 'Network error. Please check your connection.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const live = sessions.filter((s) => s.status === 'live');
  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'rescheduled');
  const past = sessions.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  const liveCount = live.length;
  const rsvpCount = sessions.filter((s) => s.access?.isBooked).length;

  return (
    <View style={styles.screen}>
      <ExploreScreenHeader
        showBack
        eyebrow="Live"
        title="Trading Sessions"
        subtitle="Visible to everyone — reserve and join with the right plan"
        trailing={
          liveCount > 0 ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{liveCount}</Text>
            </View>
          ) : (
            <View style={styles.livePillPlaceholder} />
          )
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPurple} />}
        showsVerticalScrollIndicator={false}
      >
        {!loading && sessions.length > 0 ? (
          <GlassListCard contentStyle={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Your RSVPs</Text>
            <Text style={styles.summaryValue}>{rsvpCount} confirmed</Text>
            <Text style={styles.summarySub}>Sessions show for all students. Join links unlock with the required package.</Text>
          </GlassListCard>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.brandPurple} style={{ marginTop: 40 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="videocam-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>Check back soon for upcoming live trading sessions.</Text>
          </View>
        ) : (
          <>
            {live.length > 0 && (
              <View style={styles.section}>
                <Text style={exploreChipStyles.sectionTitle}>Happening now</Text>
                {live.map((s) => (
                  <SessionCard key={s._id} session={s} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />
                ))}
              </View>
            )}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={exploreChipStyles.sectionTitle}>Upcoming</Text>
                {upcoming.map((s) => (
                  <SessionCard key={s._id} session={s} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />
                ))}
              </View>
            )}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={exploreChipStyles.sectionTitle}>Past sessions</Text>
                {past.map((s) => (
                  <SessionCard key={s._id} session={s} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SessionCard({
  session: s,
  onBook,
  onCancel,
  bookingId,
  cancellingId,
}: {
  session: LiveSessionItem;
  onBook: (id: string) => void;
  onCancel: (id: string) => void;
  bookingId: string | null;
  cancellingId: string | null;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusMap = STATUS_CONFIG(colors);
  const cfg = statusMap[s.status] ?? statusMap.scheduled;
  const instructorName = formatInstructor(s.teacher);
  const isLive = s.status === 'live';
  const isPast = s.status === 'completed' || s.status === 'cancelled';
  const isBusy = bookingId === s._id;
  const isCancelling = cancellingId === s._id;
  const access = s.access;

  return (
    <GlassListCard contentStyle={[styles.card, isLive && styles.cardLive]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {access?.packageLabel ? (
          <Text style={styles.packagePill}>{access.packageLabel}</Text>
        ) : null}
        {s.maxParticipants && s.currentParticipants != null ? (
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text style={styles.participantsText}>
              {s.currentParticipants.length}/{s.maxParticipants}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.cardTitle}>{s.title}</Text>
      {instructorName ? (
        <View style={styles.instructorRow}>
          <Ionicons name="person-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.instructorText}>{instructorName}</Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatSessionDate(s.scheduledAt)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatSessionTime(s.scheduledAt)}</Text>
        </View>
        {s.duration ? (
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDuration(s.duration)}</Text>
          </View>
        ) : null}
      </View>

      {!isPast && (
        <View style={styles.actionsRow}>
          {access?.canJoin && s.meetingLink ? (
            <Pressable style={styles.joinBtn} onPress={() => Linking.openURL(s.meetingLink!)}>
              <Ionicons name="videocam" size={16} color={colors.primaryForeground} />
              <Text style={styles.joinText}>Join session</Text>
            </Pressable>
          ) : access?.canReserve ? (
            <Pressable style={styles.bookBtn} onPress={() => onBook(s._id)} disabled={!!bookingId}>
              {isBusy ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={15} color={colors.primaryForeground} />
                  <Text style={styles.bookTextPrimary}>Reserve spot</Text>
                </>
              )}
            </Pressable>
          ) : access?.upgradeRequired ? (
            <Pressable style={styles.upgradeBtn} onPress={() => router.push('/subscription-upgrade')}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.brandPurple} />
              <Text style={styles.upgradeText}>Upgrade to reserve</Text>
            </Pressable>
          ) : access?.isBooked ? (
            <View style={styles.bookedRow}>
              <View style={styles.bookedBadge}>
                <Ionicons name="checkmark-circle" size={15} color={colors.brandPurple} />
                <Text style={styles.bookedText}>Reserved</Text>
              </View>
              {access.canCancel ? (
                <Pressable style={styles.cancelBtn} onPress={() => onCancel(s._id)} disabled={!!cancellingId}>
                  {isCancelling ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <Text style={styles.cancelText}>Cancel</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={styles.visibleOnly}>Visible on your plan — reservation opens when the session is available.</Text>
          )}
        </View>
      )}

      {s.status === 'completed' && s.recordingUrl && access?.hasPackageAccess ? (
        <Pressable style={styles.recordingBtn} onPress={() => Linking.openURL(s.recordingUrl!)}>
          <Ionicons name="play-circle-outline" size={16} color={colors.text} />
          <Text style={styles.recordingText}>Watch recording</Text>
        </Pressable>
      ) : null}
    </GlassListCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.brandPurple}20`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${colors.brandPurple}35`,
    minWidth: 40,
    justifyContent: 'center',
  },
  livePillPlaceholder: { width: 40, height: 40 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brandPurple },
  liveText: { fontSize: 12, fontWeight: '800', color: colors.brandPurple },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 24, paddingTop: 8 },
  summaryCard: { padding: 16, gap: 4 },
  summaryEyebrow: { fontSize: 12, fontWeight: '700', color: colors.brandPurple },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  summarySub: { fontSize: 12, fontWeight: '500', color: colors.textMuted, lineHeight: 17 },
  section: { gap: 12 },
  card: { padding: 16, gap: 10 },
  cardLive: {
    borderColor: colors.brandPurple,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  packagePill: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  participantsText: { fontSize: 12, color: colors.textMuted },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instructorText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  actionsRow: { marginTop: 4 },
  joinBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.brandPurple,
  },
  joinText: { fontSize: 14, fontWeight: '800', color: colors.primaryForeground },
  bookBtn: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, backgroundColor: colors.brandPurple,
  },
  bookTextPrimary: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  upgradeBtn: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  upgradeText: { fontSize: 14, fontWeight: '700', color: colors.brandPurple },
  bookedRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bookedBadge: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, backgroundColor: `${colors.brandPurple}12`,
    borderWidth: 1, borderColor: `${colors.brandPurple}25`,
  },
  bookedText: { fontSize: 14, fontWeight: '700', color: colors.brandPurple },
  cancelBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  visibleOnly: { fontSize: 12, fontWeight: '500', color: colors.textMuted, lineHeight: 17 },
  recordingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 40, borderRadius: 10, marginTop: 4,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1, borderColor: colors.border,
  },
  recordingText: { fontSize: 13, fontWeight: '700', color: colors.text },
  empty: { alignItems: 'center', marginTop: 48, gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  emptyText: { fontSize: 13.5, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
});
}
