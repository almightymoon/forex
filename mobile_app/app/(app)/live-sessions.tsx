import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as Linking from 'expo-linking';
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
import { getStoredUser } from '../../utils/auth';

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  teacher?: { firstName?: string; lastName?: string };
  scheduledAt: string;
  duration?: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'rescheduled';
  meetingLink?: string;
  recordingUrl?: string;
  maxParticipants?: number;
  currentParticipants?: Array<{ student: { _id?: string } | string }>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function formatDuration(mins?: number) {
  if (!mins) return '';
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
  return `${mins}m`;
}

const STATUS_CONFIG = (colors: AppColors): Record<string, { label: string; color: string; bg: string }> => ({
  live: { label: '● LIVE', color: '#FFFFFF', bg: colors.black },
  scheduled: { label: 'Scheduled', color: colors.text, bg: colors.surfaceHover },
  completed: { label: 'Completed', color: colors.textDim, bg: colors.surfaceHover },
  cancelled: { label: 'Cancelled', color: colors.textMuted, bg: colors.surfaceHover },
  rescheduled: { label: 'Rescheduled', color: colors.textSecondary, bg: colors.surfaceHover },
});

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function LiveSessionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const [user, res] = await Promise.all([getStoredUser(), apiFetch('api/sessions')]);
      setUserId(user?._id ?? null);
      if (res.ok) {
        const raw = await res.json();
        const list: LiveSession[] = Array.isArray(raw) ? raw : raw.sessions ?? raw.data ?? [];
        setSessions(list);
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
        toast('You\'re signed up!');
        fetchSessions();
      } else {
        const d = await res.json().catch(() => ({}));
        const msg = (d as { message?: string; error?: string }).message ?? (d as { error?: string }).error ?? 'Could not sign up. Please try again.';
        Alert.alert('Booking failed', msg);
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally { setBookingId(null); }
  };

  const cancelSession = async (sessionId: string) => {
    if (cancellingId) return;
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel your spot?', [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive',
        onPress: async () => {
          setCancellingId(sessionId);
          try {
            const res = await apiFetch(`api/sessions/${sessionId}/cancel`, { method: 'POST' });
            if (res.ok) {
              toast('Booking cancelled.');
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

  const isBooked = (s: LiveSession) => {
    if (!userId || !s.currentParticipants) return false;
    return s.currentParticipants.some((p) => {
      const id = typeof p.student === 'string' ? p.student : p.student?._id;
      return id === userId;
    });
  };

  const live = sessions.filter((s) => s.status === 'live');
  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'rescheduled');
  const past = sessions.filter((s) => s.status === 'completed' || s.status === 'cancelled');

  const liveCount = live.length;

  return (
    <View style={styles.screen}>
      <ExploreScreenHeader
        showBack
        eyebrow="Live"
        title="Trading Sessions"
        subtitle="Join live market breakdowns with our instructors"
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} />
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
                {live.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />)}
              </View>
            )}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={exploreChipStyles.sectionTitle}>Upcoming</Text>
                {upcoming.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />)}
              </View>
            )}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={exploreChipStyles.sectionTitle}>Past sessions</Text>
                {past.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} onCancel={cancelSession} bookingId={bookingId} cancellingId={cancellingId} />)}
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
  booked,
  onBook,
  onCancel,
  bookingId,
  cancellingId,
}: {
  session: LiveSession;
  booked: boolean;
  onBook: (id: string) => void;
  onCancel: (id: string) => void;
  bookingId: string | null;
  cancellingId: string | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusMap = STATUS_CONFIG(colors);
  const cfg = statusMap[s.status] ?? statusMap.scheduled;
  const instructorName = formatInstructor(s.teacher);
  const isLive = s.status === 'live';
  const isPast = s.status === 'completed' || s.status === 'cancelled';
  const isBusy = bookingId === s._id;
  const isCancelling = cancellingId === s._id;

  return (
    <GlassListCard contentStyle={[styles.card, isLive && styles.cardLive]}>
      {/* Status chip */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {s.maxParticipants && s.currentParticipants != null ? (
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text style={styles.participantsText}>
              {s.currentParticipants.length}/{s.maxParticipants}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Title + instructor */}
      <Text style={styles.cardTitle}>{s.title}</Text>
      {instructorName ? (
        <View style={styles.instructorRow}>
          <Ionicons name="person-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.instructorText}>{instructorName}</Text>
        </View>
      ) : null}

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDate(s.scheduledAt)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatTime(s.scheduledAt)}</Text>
        </View>
        {s.duration ? (
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDuration(s.duration)}</Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      {!isPast && (
        <View style={styles.actionsRow}>
          {(isLive || booked) && s.meetingLink ? (
            <Pressable style={styles.joinBtn} onPress={() => Linking.openURL(s.meetingLink!)}>
              <Ionicons name="videocam" size={16} color={colors.primaryForeground} />
              <Text style={styles.joinText}>Join session</Text>
            </Pressable>
          ) : !booked ? (
            <Pressable
              style={styles.bookBtn}
              onPress={() => onBook(s._id)}
              disabled={!!bookingId}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={15} color={colors.text} />
                  <Text style={styles.bookText}>Sign Up</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.bookedRow}>
              <View style={styles.bookedBadge}>
                <Ionicons name="checkmark-circle" size={15} color={colors.text} />
                <Text style={styles.bookedText}>Signed up</Text>
              </View>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => onCancel(s._id)}
                disabled={!!cancellingId}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FF5A5A" />
                ) : (
                  <Text style={styles.cancelText}>Cancel</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Recording */}
      {s.status === 'completed' && s.recordingUrl ? (
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    minWidth: 40,
    justifyContent: 'center',
  },
  livePillPlaceholder: { width: 40, height: 40 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 24, paddingTop: 8 },
  section: { gap: 12 },
  card: { padding: 16, gap: 10 },
  cardLive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    backgroundColor: colors.primary,
  },
  joinText: { fontSize: 14, fontWeight: '800', color: colors.primaryForeground },
  bookBtn: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bookText: { fontSize: 14, fontWeight: '700', color: colors.text },
  bookedRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  bookedBadge: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, backgroundColor: colors.surfaceHover,
    borderWidth: 1, borderColor: colors.border,
  },
  bookedText: { fontSize: 14, fontWeight: '700', color: colors.text },
  cancelBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
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
