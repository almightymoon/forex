import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: '● LIVE', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  scheduled: { label: 'Scheduled', color: '#3AADFF', bg: 'rgba(58,173,255,0.12)' },
  completed: { label: 'Completed', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)' },
  cancelled: { label: 'Cancelled', color: '#FF5A5A', bg: 'rgba(255,90,90,0.1)' },
  rescheduled: { label: 'Rescheduled', color: '#FFC107', bg: 'rgba(255,193,7,0.12)' },
};

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function LiveSessionsScreen() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

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
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Live Sessions</Text>
          {liveCount > 0 && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{liveCount} Live Now</Text>
            </View>
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
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="videocam-outline" size={52} color="rgba(255,255,255,0.12)" />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>Check back soon for upcoming live trading sessions.</Text>
          </View>
        ) : (
          <>
            {live.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Happening Now</Text>
                {live.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} bookingId={bookingId} />)}
              </View>
            )}
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcoming.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} bookingId={bookingId} />)}
              </View>
            )}
            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Sessions</Text>
                {past.map((s) => <SessionCard key={s._id} session={s} booked={isBooked(s)} onBook={bookSession} bookingId={bookingId} />)}
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
  bookingId,
}: {
  session: LiveSession;
  booked: boolean;
  onBook: (id: string) => void;
  bookingId: string | null;
}) {
  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.scheduled;
  const instructorName = formatInstructor(s.teacher);
  const isLive = s.status === 'live';
  const isPast = s.status === 'completed' || s.status === 'cancelled';
  const isBusy = bookingId === s._id;

  return (
    <View style={[styles.card, isLive && styles.cardLive]}>
      {/* Status chip */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {s.maxParticipants && s.currentParticipants != null ? (
          <View style={styles.participantsRow}>
            <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.35)" />
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
          <Ionicons name="person-circle-outline" size={15} color="rgba(255,255,255,0.4)" />
          <Text style={styles.instructorText}>{instructorName}</Text>
        </View>
      ) : null}

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.metaText}>{formatDate(s.scheduledAt)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.metaText}>{formatTime(s.scheduledAt)}</Text>
        </View>
        {s.duration ? (
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={13} color="rgba(255,255,255,0.35)" />
            <Text style={styles.metaText}>{formatDuration(s.duration)}</Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      {!isPast && (
        <View style={styles.actionsRow}>
          {(isLive || booked) && s.meetingLink ? (
            <LinearGradient colors={['#0060E6', '#3AADFF']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.joinGradient}>
              <Pressable style={styles.actionPress} onPress={() => Linking.openURL(s.meetingLink!)}>
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinText}>Join Session</Text>
              </Pressable>
            </LinearGradient>
          ) : !booked ? (
            <Pressable
              style={styles.bookBtn}
              onPress={() => onBook(s._id)}
              disabled={!!bookingId}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#3AADFF" />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={15} color="#3AADFF" />
                  <Text style={styles.bookText}>Sign Up</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.bookedBadge}>
              <Ionicons name="checkmark-circle" size={15} color="#4ADE80" />
              <Text style={styles.bookedText}>Signed Up</Text>
            </View>
          )}
        </View>
      )}

      {/* Recording */}
      {s.status === 'completed' && s.recordingUrl ? (
        <Pressable style={styles.recordingBtn} onPress={() => Linking.openURL(s.recordingUrl!)}>
          <Ionicons name="play-circle-outline" size={16} color="#A78BFA" />
          <Text style={styles.recordingText}>Watch Recording</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 32, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: 'rgba(8,20,48,0.9)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, gap: 10,
  },
  cardLive: { borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(8,30,18,0.9)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800' },
  participantsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantsText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instructorText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  actionsRow: { marginTop: 4 },
  joinGradient: { borderRadius: 12, overflow: 'hidden' },
  actionPress: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  bookBtn: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(58,173,255,0.4)',
    backgroundColor: 'rgba(0,96,230,0.12)',
  },
  bookText: { fontSize: 14, fontWeight: '700', color: '#3AADFF' },
  bookedBadge: {
    height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 12, backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  bookedText: { fontSize: 14, fontWeight: '700', color: '#4ADE80' },
  recordingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 40, borderRadius: 10, marginTop: 4,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  recordingText: { fontSize: 13, fontWeight: '700', color: '#A78BFA' },
  empty: { alignItems: 'center', marginTop: 48, gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
});
