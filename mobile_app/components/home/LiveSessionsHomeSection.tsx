import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { formatInstructor } from '../../utils/formatInstructor';
import {
  buildMonthGrid,
  chunkCalendarWeeks,
  countUserReservations,
  formatSessionDate,
  formatSessionDateTime,
  getLocalSessionDate,
  isUpcomingSession,
  parseSessionsResponse,
  sessionDaysSet,
  sessionsInMonth,
  type LiveSessionItem,
} from '../../utils/liveSessions';
import { GlassCard } from './GlassCard';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function sessionOnDay(
  sessions: LiveSessionItem[],
  year: number,
  month: number,
  day: number,
) {
  return sessions.filter((s) => {
    const local = getLocalSessionDate(s.scheduledAt);
    return local.year === year && local.month === month && local.day === day;
  });
}

function SessionRow({
  session,
  onReserve,
  onCancel,
  onJoin,
  busyId,
}: {
  session: LiveSessionItem;
  onReserve: (id: string) => void;
  onCancel: (id: string) => void;
  onJoin: (url: string) => void;
  busyId: string | null;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const access = session.access;
  const instructor = formatInstructor(session.teacher);
  const isBusy = busyId === session._id;
  const isLive = session.status === 'live';

  const action = () => {
    if (access?.canJoin && session.meetingLink) {
      onJoin(session.meetingLink);
      return;
    }
    if (access?.canReserve) {
      onReserve(session._id);
      return;
    }
    if (access?.upgradeRequired) {
      router.push('/subscription-upgrade');
      return;
    }
    if (access?.canCancel) {
      onCancel(session._id);
    }
  };

  const actionLabel = access?.canJoin
    ? 'Join'
    : access?.canReserve
      ? 'Reserve'
      : access?.isBooked
        ? 'Reserved'
        : access?.upgradeRequired
          ? 'Upgrade'
          : 'View';

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionThumb}>
        <Ionicons name={isLive ? 'radio' : 'videocam'} size={20} color={colors.brandPurple} />
      </View>
      <View style={styles.sessionBody}>
        <Text style={styles.sessionMeta}>{formatSessionDateTime(session.scheduledAt)}</Text>
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {session.title}
        </Text>
        {instructor ? <Text style={styles.sessionHost}>{instructor}</Text> : null}
        {session.description ? (
          <Text style={styles.sessionDesc} numberOfLines={1}>
            {session.description}
          </Text>
        ) : null}
        {access?.packageLabel && access.packageLabel !== 'All packages' ? (
          <Text style={styles.packageTag}>{access.packageLabel} plan</Text>
        ) : null}
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.sessionAction,
          access?.canJoin && styles.sessionActionPrimary,
          access?.upgradeRequired && styles.sessionActionUpgrade,
          pressed && styles.sessionActionPressed,
        ]}
        onPress={action}
        disabled={isBusy || (access?.isBooked && !access.canJoin && !access.canCancel)}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={access?.canJoin ? colors.primaryForeground : colors.brandPurple} />
        ) : (
          <Ionicons
            name={
              access?.canJoin
                ? 'videocam'
                : access?.upgradeRequired
                  ? 'lock-closed'
                  : access?.isBooked
                    ? 'checkmark'
                    : 'notifications-outline'
            }
            size={18}
            color={access?.canJoin ? colors.primaryForeground : colors.brandPurple}
          />
        )}
        <Text
          style={[
            styles.sessionActionText,
            access?.canJoin && styles.sessionActionTextPrimary,
          ]}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function LiveSessionsHomeSection() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('api/sessions');
      if (res.ok) {
        const raw = await res.json();
        const all = parseSessionsResponse(raw);
        setSessions(all.filter(isUpcomingSession));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upcomingSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    [sessions],
  );

  const monthSessions = useMemo(
    () => sessionsInMonth(upcomingSessions, cursor.year, cursor.month),
    [upcomingSessions, cursor.year, cursor.month],
  );
  const sessionDays = useMemo(() => sessionDaysSet(monthSessions), [monthSessions]);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);
  const weeks = useMemo(() => chunkCalendarWeeks(grid), [grid]);
  const isViewingCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const todayDay = now.getDate();

  const visibleSessions = useMemo(() => {
    if (selectedDay != null) {
      return sessionOnDay(monthSessions, cursor.year, cursor.month, selectedDay).sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    }
    const inMonth = [...monthSessions].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    const source = inMonth.length > 0 ? inMonth : upcomingSessions;
    return source.slice(0, 3);
  }, [monthSessions, upcomingSessions, selectedDay, cursor.year, cursor.month]);

  const listTitle =
    selectedDay != null
      ? formatSessionDate(new Date(cursor.year, cursor.month, selectedDay).toISOString())
      : monthSessions.length > 0
        ? 'Coming up'
        : upcomingSessions.length > 0
          ? 'Next sessions'
          : 'Live sessions';

  const reserve = async (sessionId: string) => {
    setBusyId(sessionId);
    try {
      const res = await apiFetch(`api/sessions/${sessionId}/book`, { method: 'POST' });
      if (res.ok) {
        toast('Spot reserved!');
        await load();
      } else {
        const body = await res.json().catch(() => ({}));
        if ((body as { code?: string }).code === 'PACKAGE_REQUIRED') {
          Alert.alert(
            'Package required',
            'This session is not included in your plan. Upgrade to reserve your spot.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'View plans', onPress: () => router.push('/subscription-upgrade') },
            ],
          );
        } else {
          Alert.alert('Could not reserve', (body as { error?: string; message?: string }).message ?? (body as { error?: string }).error ?? 'Try again.');
        }
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (sessionId: string) => {
    setBusyId(sessionId);
    try {
      const res = await apiFetch(`api/sessions/${sessionId}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast('Reservation cancelled');
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDay(today.getDate());
  };

  const rsvpCount = countUserReservations(upcomingSessions);
  const totalUpcoming = upcomingSessions.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.heroCopy}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="videocam-outline" size={14} color={colors.brandPurple} />
          <Text style={styles.eyebrow}>Live sessions</Text>
        </View>
        <Text style={styles.heroTitle}>
          Trade live. <Text style={styles.heroAccent}>With our analysts.</Text>
        </Text>
        <Text style={styles.heroSub}>
          Trading rooms, recaps, and AMAs. All sessions are visible — reserve when your plan includes access.
        </Text>
      </View>

      <GlassCard contentStyle={styles.calendarCard} radius={24} prominent>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarTitleBlock}>
            <Text style={styles.calendarTitle}>{monthLabel}</Text>
            {!isViewingCurrentMonth ? (
              <Pressable style={styles.todayBtn} onPress={goToToday} hitSlop={8}>
                <Text style={styles.todayBtnText}>Today</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.calendarNav}>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                if (day == null) {
                  return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.dayCell} />;
                }
                const hasSession = sessionDays.has(day);
                const isSelected = selectedDay === day;
                const isToday = isViewingCurrentMonth && day === todayDay;
                return (
                  <Pressable
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      hasSession && !isSelected && styles.dayCellActive,
                      isToday && !isSelected && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        hasSession && !isSelected && styles.dayTextActive,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasSession && !isSelected ? <View style={styles.dayDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendSwatch} />
          <Text style={styles.legendText}>Days with a live session</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>This month</Text>
          <Text style={styles.summaryValue}>
            {monthSessions.length} session{monthSessions.length === 1 ? '' : 's'}
          </Text>
          <Text style={styles.summarySub}>
            {rsvpCount} confirmed RSVP{rsvpCount === 1 ? '' : 's'} for you
            {totalUpcoming > monthSessions.length
              ? ` · ${totalUpcoming} upcoming overall`
              : ''}
          </Text>
        </View>
      </GlassCard>

      <View style={styles.listBlock}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{listTitle}</Text>
          <Pressable onPress={() => router.push('/(app)/live-sessions')} hitSlop={8}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brandPurple} style={styles.loader} />
        ) : visibleSessions.length > 0 ? (
          visibleSessions.map((session) => (
            <SessionRow
              key={session._id}
              session={session}
              onReserve={reserve}
              onCancel={cancel}
              onJoin={(url) => import('expo-linking').then((L) => L.openURL(url))}
              busyId={busyId}
            />
          ))
        ) : (
          <Pressable
            style={({ pressed }) => [styles.emptyInline, pressed && styles.emptyInlinePressed]}
            onPress={() => router.push('/(app)/live-sessions')}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.brandPurple} />
            <Text style={styles.emptyTitle}>
              {selectedDay != null
                ? 'No sessions on this day'
                : monthSessions.length === 0 && totalUpcoming > 0
                  ? 'No sessions this month'
                  : 'No sessions scheduled yet'}
            </Text>
            <Text style={styles.emptySub}>
              {totalUpcoming > 0
                ? 'Browse upcoming sessions on other dates.'
                : 'Check back soon or view the full schedule.'}
            </Text>
            <View style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Browse all sessions</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primaryForeground} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 8,
      marginBottom: 8,
      gap: 14,
    },
    heroCopy: {
      gap: 6,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPurple,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    heroAccent: {
      color: colors.brandPurple,
    },
    heroSub: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 18,
    },
    calendarCard: {
      padding: 16,
      gap: 12,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    calendarTitleBlock: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    calendarTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    todayBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: `${colors.brandPurple}18`,
    },
    todayBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.brandPurple,
    },
    calendarNav: {
      flexDirection: 'row',
      gap: 8,
    },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHover,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '700',
      color: colors.textDim,
    },
    grid: {
      gap: 4,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      paddingVertical: 4,
      marginHorizontal: 1,
    },
    dayCellActive: {
      backgroundColor: `${colors.brandPurple}14`,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: `${colors.brandPurple}55`,
    },
    dayCellSelected: {
      backgroundColor: colors.brandPurple,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    dayTextActive: {
      color: colors.brandPurple,
      fontWeight: '800',
    },
    dayTextToday: {
      color: colors.brandPurple,
      fontWeight: '800',
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    dayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.brandPurple,
      marginTop: 2,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 4,
      backgroundColor: colors.brandPurple,
    },
    legendText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    summaryCard: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.surfaceHover,
      gap: 2,
    },
    summaryEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.brandPurple,
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    summarySub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
    },
    listBlock: {
      gap: 10,
    },
    loader: {
      marginVertical: 12,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.brandPurple,
    },
    seeAll: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.brandPurple,
    },
    sessionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 18,
      padding: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sessionThumb: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: `${colors.brandPurple}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    sessionMeta: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.brandPurple,
    },
    sessionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 20,
    },
    sessionHost: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sessionDesc: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },
    packageTag: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textDim,
      marginTop: 2,
    },
    sessionAction: {
      width: 68,
      minHeight: 68,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: `${colors.brandPurple}10`,
      paddingHorizontal: 6,
    },
    sessionActionPrimary: {
      backgroundColor: colors.brandPurple,
    },
    sessionActionUpgrade: {
      backgroundColor: `${colors.brandBlue}12`,
    },
    sessionActionPressed: {
      opacity: 0.9,
    },
    sessionActionText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.brandPurple,
      textAlign: 'center',
    },
    sessionActionTextPrimary: {
      color: colors.primaryForeground,
    },
    emptyInline: {
      borderRadius: 18,
      padding: 20,
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyInlinePressed: {
      opacity: 0.92,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 17,
      marginBottom: 4,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      backgroundColor: colors.brandPurple,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    emptyBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryForeground,
    },
  });
}
