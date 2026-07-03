import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveSignalsHomeCard } from '../../components/home/ActiveSignalsHomeCard';
import { AnimatedReveal } from '../../components/home/AnimatedReveal';
import { BrandSectionTitle } from '../../components/home/BrandSectionTitle';
import { HomeCourseRowCard } from '../../components/home/HomeCourseRowCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { HomeSkeleton } from '../../components/home/HomeSkeleton';
import { LiveSessionsHomeSection } from '../../components/home/LiveSessionsHomeSection';
import { MarketClockCard } from '../../components/home/MarketClockCard';
import { MarketNewsSection } from '../../components/home/MarketNewsSection';
import { RecentActivityHomeCard } from '../../components/home/RecentActivityHomeCard';
import { WelcomeHeroCard } from '../../components/home/WelcomeHeroCard';
import { getFloatingTabBarInset } from '../../components/navigation/FloatingTabBar';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { AuthUser, getStoredUser } from '../../utils/auth';
import { loadDashboardSnapshot, saveDashboardSnapshot } from '../../utils/dashboardCache';
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
  dedupeByKey,
} from '../../utils/normalize';

interface DashboardData {
  enrolledCourses: number;
  catalogTotal: number;
  allCourses: NormalizedCourse[];
  courses: NormalizedCourse[];
  recentSignals: NormalizedSignal[];
  recentActivity: ActivityItem[];
  news: NormalizedNews[];
}

const SECTION_GAP = 24;

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

function pickResumeCourse(courses: NormalizedCourse[]) {
  const inProgress = courses.filter((c) => {
    const p = c.progress ?? 0;
    return p > 0 && p < 100;
  });
  if (inProgress.length > 0) {
    return inProgress.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0];
  }
  return courses[0];
}

function buildHeroAction(
  courses: NormalizedCourse[],
  activeSignals: number,
  router: ReturnType<typeof useRouter>,
) {
  const resume = pickResumeCourse(courses);
  const inProgress =
    resume != null && (resume.progress ?? 0) > 0 && (resume.progress ?? 0) < 100;

  if (inProgress && resume) {
    return {
      subtitle: 'Pick up where you left off',
      actionLabel: 'Resume Lesson',
      onAction: () => router.push(`/(app)/course/${resume._id}`),
    };
  }
  if (activeSignals > 0) {
    return {
      subtitle: 'New signals are live on the desk',
      actionLabel: 'View Signals',
      onAction: () => router.push('/(app)/signals'),
    };
  }
  return {
    subtitle: 'Start your learning journey today',
    actionLabel: 'Browse Courses',
    onAction: () => router.push('/(app)/courses'),
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const stackInsights = screenWidth < 380;
  const styles = useMemo(
    () => createStyles(colors, getFloatingTabBarInset(insets.bottom)),
    [colors, insets.bottom],
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = async (opts?: { force?: boolean }) => {
    const cache = opts?.force ? 'reload' : 'default';
    try {
      const [enrolledRes, catalogRes, signalsRes, activityRes, newsRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled', { cache }),
        apiFetch('api/courses', { cache }),
        apiFetch('api/signals', { cache }),
        apiFetch('api/users/activity/recent?limit=6', { cache }),
        apiFetch('api/news?limit=5', { cache }),
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
        recentActivity = dedupeByKey(
          normalizeList<Record<string, unknown>>(list).map(normalizeActivity),
          (item) => item.id,
        );
      }

      let news: NormalizedNews[] = [];
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const raw = await newsRes.value.json();
        news = dedupeByKey(
          normalizeList<Record<string, unknown>>(raw).map(normalizeNews),
          (item) => item.url || item.id,
        );
      }

      const next: DashboardData = {
        enrolledCourses: courses.length,
        catalogTotal: catalog.length,
        allCourses: courses,
        courses: courses.slice(0, 2),
        recentSignals: signals,
        recentActivity,
        news,
      };
      setData(next);
      void saveDashboardSnapshot(next);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const [snapshot, storedUser] = await Promise.all([loadDashboardSnapshot(), getStoredUser()]);
      if (!active) return;
      if (storedUser) setUser(storedUser);
      if (snapshot) {
        setData({
          enrolledCourses: snapshot.enrolledCourses,
          catalogTotal: snapshot.catalogTotal ?? snapshot.enrolledCourses,
          allCourses: snapshot.allCourses ?? snapshot.courses,
          courses: snapshot.courses,
          recentSignals: snapshot.recentSignals,
          recentActivity: snapshot.recentActivity,
          news: snapshot.news,
        });
        setLoading(false);
      }
      fetchData();
    })();
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getStoredUser().then(setUser);
      apiFetch('api/notifications/user')
        .then(async (r) => {
          if (r.ok) {
            const d = await r.json();
            if (typeof d.unreadCount === 'number') {
              setUnreadCount(d.unreadCount);
              return;
            }
            const list: Array<{ read?: boolean }> = d.notifications ?? [];
            setUnreadCount(list.filter((n) => !n.read).length);
          }
        })
        .catch(() => {});
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData({ force: true });
  };

  const firstName = user?.firstName ?? 'User';
  const courses = data?.courses ?? [];
  const enrolledTotal = data?.enrolledCourses ?? 0;
  const signals = data?.recentSignals ?? [];
  const topSignal = signals.find((s) => s.status === 'active') ?? signals[0];
  const activeSignals = signals.filter((s) => s.status === 'active').length;
  const hasActiveSignal = topSignal?.status === 'active';

  const hero = useMemo(
    () => buildHeroAction(data?.allCourses ?? courses, activeSignals, router),
    [data?.allCourses, courses, activeSignals, router],
  );

  const showSkeleton = loading && !data;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
        showsVerticalScrollIndicator={false}
      >
        <AnimatedReveal index={0}>
          <HomeHeader
            firstName={firstName}
            hasUnread={unreadCount > 0}
            profileImage={user?.profileImage}
            onSettings={() => router.push('/(app)/settings')}
            onNotifications={() => router.push('/(app)/notifications')}
            onProfile={() => router.push('/(app)/profile')}
          />
        </AnimatedReveal>

        {showSkeleton ? (
          <HomeSkeleton />
        ) : (
          <>
            <AnimatedReveal index={1}>
              <WelcomeHeroCard
                firstName={firstName}
                enrolledCount={enrolledTotal}
                activeSignals={activeSignals}
                subtitle={hero.subtitle}
                actionLabel={hero.actionLabel}
                onPrimaryAction={hero.onAction}
              />
            </AnimatedReveal>

            <AnimatedReveal index={2}>
              <MarketClockCard />
            </AnimatedReveal>

            <AnimatedReveal index={3}>
              <BrandSectionTitle
                title="Your Courses"
                actionLabel={enrolledTotal > 2 ? 'See all' : undefined}
                onActionPress={enrolledTotal > 2 ? () => router.push('/(app)/courses') : undefined}
              />
            </AnimatedReveal>

            {courses.length > 0 ? (
              courses.map((course, index) => (
                <AnimatedReveal key={`${course._id}-${index}`} index={4 + index}>
                  <HomeCourseRowCard
                    title={course.title}
                    level={course.level ?? 'Beginner'}
                    thumbnail={course.thumbnail}
                    lessonCount={course.lessonCount}
                    progress={course.progress}
                    onPress={() => router.push(`/(app)/course/${course._id}`)}
                    onMenuPress={() => router.push(`/(app)/course/${course._id}`)}
                  />
                </AnimatedReveal>
              ))
            ) : (
              <AnimatedReveal index={4}>
                <View style={styles.emptyCourses}>
                  <Text style={styles.emptyCoursesTitle}>Start your first course</Text>
                  <Text style={styles.emptyCoursesText}>
                    Browse the catalog and begin learning at your own pace.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.emptyCoursesBtn, pressed && styles.emptyCoursesBtnPressed]}
                    onPress={() => router.push('/(app)/courses')}
                  >
                    <Text style={styles.emptyCoursesBtnText}>Browse Courses</Text>
                  </Pressable>
                </View>
              </AnimatedReveal>
            )}

            <AnimatedReveal index={6} style={styles.insightsSection}>
              <View style={[styles.insightsGrid, stackInsights && styles.insightsStack]}>
                <ActiveSignalsHomeCard
                  pair={topSignal?.pair}
                  direction={topSignal?.direction}
                  entry={topSignal?.entryPrice}
                  takeProfit={topSignal?.takeProfit}
                  stopLoss={topSignal?.stopLoss}
                  hasSignal={hasActiveSignal}
                  onPress={() => router.push('/(app)/signals')}
                />
                <RecentActivityHomeCard
                  items={data?.recentActivity ?? []}
                  onSeeAll={() => router.push('/(app)/notifications')}
                  onItemPress={(item) => router.push(activityRoute(item) as never)}
                />
              </View>
            </AnimatedReveal>

            <AnimatedReveal index={8}>
              <MarketNewsSection
                items={data?.news ?? []}
                onViewAll={() => router.push('/(app)/news')}
                onPressArticle={(item) => openNewsArticle(router, item)}
              />
            </AnimatedReveal>

            <AnimatedReveal index={9}>
              <LiveSessionsHomeSection />
            </AnimatedReveal>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: import('../../constants/theme').AppColors, bottomInset: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: bottomInset,
    },
    emptyCourses: {
      borderRadius: 20,
      backgroundColor: colors.surfaceHover,
      padding: 24,
      alignItems: 'center',
      marginBottom: SECTION_GAP,
      gap: 8,
    },
    emptyCoursesTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    emptyCoursesText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 4,
    },
    emptyCoursesBtn: {
      marginTop: 4,
      backgroundColor: colors.brandPurple,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    emptyCoursesBtnPressed: { opacity: 0.9 },
    emptyCoursesBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    insightsSection: {
      marginTop: SECTION_GAP,
    },
    insightsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    insightsStack: {
      flexDirection: 'column',
    },
  });
}
