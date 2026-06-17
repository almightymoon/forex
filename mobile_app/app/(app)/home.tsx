import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityCard } from '../../components/ActivityCard';
import { AppHeader } from '../../components/AppHeader';
import { CourseCard } from '../../components/CourseCard';
import { GradientButton } from '../../components/GradientButton';
import { QuickAccessCard } from '../../components/QuickAccessCard';
import { SignalCard } from '../../components/SignalCard';
import { StatCard } from '../../components/StatCard';
import { apiFetch } from '../../utils/api';
import { AuthUser, getStoredUser } from '../../utils/auth';
import { getEnrolledCourseIds } from '../../utils/enrollment';
import {
  getTopQuickAccessItems,
  recordQuickAccessRoute,
  recordQuickAccessUse,
  type QuickAccessItem,
} from '../../utils/quickAccess';
import {
  ActivityItem,
  NormalizedCourse,
  NormalizedSignal,
  normalizeActivity,
  normalizeCourse,
  normalizeList,
  normalizeSignal,
} from '../../utils/normalize';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardData {
  enrolledCourses: number;
  totalSignals: number;
  certificates: number;
  courses: NormalizedCourse[];
  recentSignals: NormalizedSignal[];
  recentActivity: ActivityItem[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);

  const refreshQuickAccess = useCallback(async (dashboard: DashboardData | null) => {
    const items = await getTopQuickAccessItems(4, dashboard ? {
      recentActivity: dashboard.recentActivity,
      enrolledCourses: dashboard.enrolledCourses,
      totalSignals: dashboard.totalSignals,
      certificates: dashboard.certificates,
    } : undefined);
    setQuickAccess(items);
  }, []);

  const fetchData = async () => {
    try {
      const [enrolledRes, catalogRes, signalsRes, certsRes, activityRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled'),
        apiFetch('api/courses'),
        apiFetch('api/signals'),
        apiFetch('api/certificates/my-certificates'),
        apiFetch('api/users/activity/recent?limit=5'),
      ]);

      const catalog = catalogRes.status === 'fulfilled' && catalogRes.value.ok
        ? normalizeList<Record<string, unknown>>(await catalogRes.value.json()).map(normalizeCourse)
        : [];

      let courses: NormalizedCourse[] = [];

      // Strategy 1: dedicated enrolled endpoint
      if (enrolledRes.status === 'fulfilled' && enrolledRes.value.ok) {
        const list = normalizeList<Record<string, unknown>>(await enrolledRes.value.json()).map(normalizeCourse);
        if (list.length > 0) courses = list;
      }

      // Strategy 2: cross-reference user profile enrolledCourses against catalog
      if (courses.length === 0) {
        try {
          const profileRes = await apiFetch('api/users/profile/me');
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const enrolledCourses = profile?.enrolledCourses as Array<{ courseId?: unknown }> | undefined;
            if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0 && catalog.length > 0) {
              const enrolledIds = new Set(
                enrolledCourses.map((e) => String(e.courseId ?? '')).filter(Boolean)
              );
              courses = catalog.filter((c) => enrolledIds.has(c._id));
            }
          }
        } catch { /* ignore */ }
      }

      // Strategy 3: local storage fallback
      if (courses.length === 0) {
        const ids = await getEnrolledCourseIds();
        if (ids.length > 0 && catalog.length > 0) {
          courses = catalog.filter((c) => ids.includes(c._id));
        }
      }
      const signals = signalsRes.status === 'fulfilled' && signalsRes.value.ok
        ? normalizeList<Record<string, unknown>>(await signalsRes.value.json()).map(normalizeSignal)
        : [];
      const certs = certsRes.status === 'fulfilled' && certsRes.value.ok
        ? normalizeList(await certsRes.value.json())
        : [];
      const activityData = activityRes.status === 'fulfilled' && activityRes.value.ok
        ? await activityRes.value.json()
        : { activities: [] };

      const dashboard: DashboardData = {
        enrolledCourses: courses.length,
        totalSignals: signals.length,
        certificates: certs.length,
        courses: courses.slice(0, 3),
        recentSignals: signals.slice(0, 3),
        recentActivity: normalizeList<Record<string, unknown>>(activityData.activities ?? activityData)
          .map(normalizeActivity)
          .slice(0, 3),
      };
      setData(dashboard);
      await refreshQuickAccess(dashboard);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Refresh user (avatar, name) and unread count every time the screen focuses
  useFocusEffect(useCallback(() => {
    getStoredUser().then(setUser);
    apiFetch('api/notifications').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        const list: Array<{ read?: boolean }> = d.notifications ?? d ?? [];
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    }).catch(() => {});
    refreshQuickAccess(data);
  }, [data, refreshQuickAccess]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const firstName = user?.firstName ?? 'Trader';
  const hasCourses = (data?.courses?.length ?? 0) > 0;
  const hasSignals = (data?.recentSignals?.length ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <AppHeader
          title="THE FX NAVIGATORS"
          subtitle="Forex Education Platform"
          profileImage={user?.profileImage}
          hasUnread={unreadCount > 0}
          onNotifications={() => router.push('/(app)/notifications')}
          onProfile={() => router.push('/(app)/profile')}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>
            <Text style={styles.nameHighlight}>{firstName}</Text> 👋
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                compact
                label="Courses"
                value={data?.enrolledCourses ?? 0}
                icon={<Ionicons name="book" size={16} color="#3AADFF" />}
                accent="#3AADFF"
              />
              <StatCard
                compact
                label="Signals"
                value={data?.totalSignals ?? 0}
                icon={<Ionicons name="pulse" size={16} color="#4ADE80" />}
                accent="#4ADE80"
                highlighted={(data?.totalSignals ?? 0) > 0}
              />
              <StatCard
                compact
                label="Certs"
                value={data?.certificates ?? 0}
                icon={<Ionicons name="shield" size={16} color="#A78BFA" />}
                accent="#A78BFA"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Courses</Text>
              {hasCourses ? (
                <View style={styles.courseList}>
                  {data!.courses.map((c) => (
                    <CourseCard
                      key={c._id}
                      title={c.title}
                      instructor={c.instructor}
                      progress={c.progress ?? 0}
                      thumbnail={c.thumbnail}
                      lessonCount={c.lessonCount}
                      onPress={() => router.push(`/(app)/course/${c._id}`)}
                    />
                  ))}
                  <Pressable onPress={() => router.push('/(app)/courses')}>
                    <Text style={styles.seeAll}>See all courses</Text>
                  </Pressable>
                </View>
              ) : (
                <LinearGradient
                  colors={['rgba(0,96,230,0.22)', 'rgba(8,20,48,0.95)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.myCoursesHero}
                >
                  <View style={styles.bookGlow} />
                  <View style={styles.bookIcon}>
                    <Ionicons name="book" size={44} color="#3AADFF" />
                  </View>
                  <Text style={styles.myCoursesTitle}>Your learning journey starts here</Text>
                  <Text style={styles.myCoursesText}>
                    Explore our catalog and start building your edge.
                  </Text>
                  <GradientButton
                    title="Browse Courses →"
                    noMargin
                    onPress={() => router.push('/(app)/courses')}
                    style={styles.browseBtn}
                  />
                </LinearGradient>
              )}
            </View>

            {hasSignals && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Trading Signals</Text>
                  <Pressable onPress={() => router.push('/(app)/signals')}>
                    <Text style={styles.seeAll}>View all</Text>
                  </Pressable>
                </View>
                <View style={styles.signalList}>
                  {data!.recentSignals.map((s) => (
                    <SignalCard
                      key={s._id}
                      pair={s.pair}
                      direction={s.direction}
                      entry={s.entryPrice}
                      stopLoss={s.stopLoss}
                      takeProfit={s.takeProfit}
                      status={s.status}
                      pips={s.pips}
                      createdAt={s.createdAt ? new Date(s.createdAt).toLocaleDateString() : undefined}
                    />
                  ))}
                </View>
              </View>
            )}

            {(data?.recentActivity?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <Pressable onPress={() => router.push('/(app)/notifications')}>
                    <Text style={styles.seeAll}>View all</Text>
                  </Pressable>
                </View>
                <View style={styles.activityList}>
                  {data!.recentActivity.map((a) => (
                    <ActivityCard
                      key={a.id}
                      title={a.title}
                      message={a.message}
                      timestamp={a.timestamp}
                      onPress={() => {
                        if (a.type === 'trading_signal') {
                          recordQuickAccessRoute('/(app)/signals');
                          router.push('/(app)/signals');
                        } else if (a.type === 'live_session') {
                          recordQuickAccessRoute('/(app)/live-sessions');
                          router.push('/(app)/live-sessions');
                        } else if (a.type === 'course_enrollment' || a.type === 'lesson_complete') {
                          recordQuickAccessRoute('/(app)/progress');
                          router.push('/(app)/courses');
                        } else if (a.type === 'certificate') {
                          recordQuickAccessRoute('/(app)/certificates');
                          router.push('/(app)/certificates');
                        } else if (a.type === 'payment') {
                          recordQuickAccessRoute('/(app)/subscription');
                          router.push('/(app)/subscription');
                        } else if (a.type === 'referral') {
                          recordQuickAccessRoute('/(app)/referrals');
                          router.push('/(app)/referrals');
                        } else {
                          router.push('/(app)/notifications');
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.quickGrid}>
                {quickAccess.map((item) => (
                  <QuickAccessCard
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    onPress={async () => {
                      await recordQuickAccessUse(item.id);
                      router.push(item.route as any);
                    }}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 22 },
  greetingBlock: { gap: 2 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.45)' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  nameHighlight: { color: '#FFC107' },
  statsRow: { flexDirection: 'row', gap: 10 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#3AADFF', textAlign: 'center', marginTop: 4 },
  courseList: { gap: 10 },
  myCoursesHero: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.18)',
    padding: 24,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  bookGlow: {
    position: 'absolute',
    top: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(58,173,255,0.2)',
  },
  bookIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(0,96,230,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.35)',
    shadowColor: '#3AADFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 6,
  },
  myCoursesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  myCoursesText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  browseBtn: { width: '100%' },
  activityList: { gap: 10 },
  signalList: { gap: 10 },
  quickGrid: { flexDirection: 'row', gap: 10 },
});
