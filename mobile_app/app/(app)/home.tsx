import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActiveSignalsHomeCard } from '../../components/home/ActiveSignalsHomeCard';
import { HomeCourseCard } from '../../components/home/HomeCourseCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { MarketNewsSection } from '../../components/home/MarketNewsSection';
import { RecentActivityHomeCard } from '../../components/home/RecentActivityHomeCard';
import { WelcomeHeroCard } from '../../components/home/WelcomeHeroCard';
import { colors } from '../../constants/theme';
import { apiFetch } from '../../utils/api';
import { AuthUser, getStoredUser } from '../../utils/auth';
import { getEnrolledCourseIds } from '../../utils/enrollment';
import { openNewsArticle } from '../../utils/openNews';
import {
  ActivityItem,
  NormalizedCourse,
  NormalizedNews,
  NormalizedSignal,
  normalizeActivity,
  normalizeCourse,
  normalizeList,
  normalizeNews,
  normalizeSignal,
} from '../../utils/normalize';

interface DashboardData {
  enrolledCourses: number;
  courses: NormalizedCourse[];
  recentSignals: NormalizedSignal[];
  recentActivity: ActivityItem[];
  news: NormalizedNews[];
}

function activityRoute(item: ActivityItem): string {
  switch (item.type) {
    case 'trading_signal':
      return '/(app)/signals';
    case 'live_session':
      return '/(app)/live-sessions';
    case 'course_progress':
    case 'assignment':
      return '/(app)/progress';
    case 'notification':
      return '/(app)/notifications';
    default:
      return '/(app)/more';
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async () => {
    try {
      const [enrolledRes, catalogRes, signalsRes, activityRes, newsRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled'),
        apiFetch('api/courses'),
        apiFetch('api/signals'),
        apiFetch('api/users/activity/recent?limit=4'),
        apiFetch('api/news?limit=5'),
      ]);

      const catalog =
        catalogRes.status === 'fulfilled' && catalogRes.value.ok
          ? normalizeList<Record<string, unknown>>(await catalogRes.value.json()).map(normalizeCourse)
          : [];

      let courses: NormalizedCourse[] = [];

      if (enrolledRes.status === 'fulfilled' && enrolledRes.value.ok) {
        const list = normalizeList<Record<string, unknown>>(await enrolledRes.value.json()).map(
          normalizeCourse,
        );
        if (list.length > 0) courses = list;
      }

      if (courses.length === 0) {
        try {
          const profileRes = await apiFetch('api/users/profile/me');
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const enrolledCourses = profile?.enrolledCourses as Array<{ courseId?: unknown }> | undefined;
            if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0 && catalog.length > 0) {
              const enrolledIds = new Set(
                enrolledCourses.map((e) => String(e.courseId ?? '')).filter(Boolean),
              );
              courses = catalog.filter((c) => enrolledIds.has(c._id));
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (courses.length === 0) {
        const ids = await getEnrolledCourseIds();
        if (ids.length > 0 && catalog.length > 0) {
          courses = catalog.filter((c) => ids.includes(c._id));
        }
      }

      const signals =
        signalsRes.status === 'fulfilled' && signalsRes.value.ok
          ? normalizeList<Record<string, unknown>>(await signalsRes.value.json()).map(normalizeSignal)
          : [];

      let recentActivity: ActivityItem[] = [];
      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const raw = await activityRes.value.json();
        const list = raw.activities ?? raw.data ?? [];
        recentActivity = normalizeList<Record<string, unknown>>(list).map(normalizeActivity);
      }

      let news: NormalizedNews[] = [];
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const raw = await newsRes.value.json();
        news = normalizeList<Record<string, unknown>>(raw).map(normalizeNews);
      }

      setData({
        enrolledCourses: courses.length,
        courses: courses.slice(0, 2),
        recentSignals: signals,
        recentActivity,
        news,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStoredUser().then(setUser);
      apiFetch('api/notifications')
        .then(async (r) => {
          if (r.ok) {
            const d = await r.json();
            const list: Array<{ read?: boolean }> = d.notifications ?? d ?? [];
            setUnreadCount(list.filter((n) => !n.read).length);
          }
        })
        .catch(() => {});
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const firstName = user?.firstName ?? 'User';
  const topSignal = data?.recentSignals?.find((s) => s.status === 'active') ?? data?.recentSignals?.[0];
  const activeSignals = data?.recentSignals?.filter((s) => s.status === 'active').length ?? 0;
  const hasCourses = (data?.courses?.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerWrap}>
        <HomeHeader
          profileImage={user?.profileImage}
          hasUnread={unreadCount > 0}
          onNotifications={() => router.push('/(app)/notifications')}
          onSettings={() => router.push('/(app)/settings')}
          onProfile={() => router.push('/(app)/profile')}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.cyan} style={styles.loader} />
        ) : (
          <>
            <WelcomeHeroCard
              firstName={firstName}
              courses={data?.enrolledCourses ?? 0}
              activeSignals={activeSignals}
              onStartNow={() => router.push('/(app)/courses')}
            />

            <Text style={styles.sectionTitle}>Your Courses</Text>
            {hasCourses ? (
              data!.courses.map((c) => (
                <HomeCourseCard
                  key={c._id}
                  title={c.title}
                  level={c.level ?? 'Beginners'}
                  thumbnail={c.thumbnail}
                  lessonCount={c.lessonCount}
                  onPress={() => router.push(`/(app)/course/${c._id}`)}
                />
              ))
            ) : (
              <View style={styles.emptyCourses}>
                <Text style={styles.emptyTitle}>No courses yet</Text>
                <Text style={styles.emptySub}>Browse the catalog to start learning</Text>
              </View>
            )}

            <View style={styles.bottomRow}>
              <ActiveSignalsHomeCard
                entry={topSignal?.entryPrice}
                takeProfit={topSignal?.takeProfit}
                stopLoss={topSignal?.stopLoss}
                onPress={() => router.push('/(app)/signals')}
              />
              <RecentActivityHomeCard
                items={data?.recentActivity ?? []}
                onPress={() => router.push('/(app)/notifications')}
                onItemPress={(item) => router.push(activityRoute(item) as never)}
              />
            </View>

            <MarketNewsSection
              items={data?.news ?? []}
              onPressArticle={(item) => openNewsArticle(router, item)}
              onViewAll={() => router.push('/(app)/news')}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerWrap: {
    paddingHorizontal: 20,
    zIndex: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  loader: {
    marginTop: 48,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 4,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 14,
  },
  emptyCourses: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
