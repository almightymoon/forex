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
import type { AppIconName } from '../../components/AppIcon';
import { NewsCard } from '../../components/NewsCard';
import { ActivityFeedCard } from '../../components/home/ActivityFeedCard';
import { HomeCourseCard } from '../../components/home/HomeCourseCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { LatestSignalCard } from '../../components/home/LatestSignalCard';
import { QuickActionRow } from '../../components/home/QuickActionRow';
import { WelcomeHeroCard } from '../../components/home/WelcomeHeroCard';
import { colors } from '../../constants/theme';
import { apiFetch } from '../../utils/api';
import { AuthUser, getStoredUser } from '../../utils/auth';
import { getEnrolledCourseIds } from '../../utils/enrollment';
import { openNewsArticle } from '../../utils/openNews';
import { recordQuickAccessRoute } from '../../utils/quickAccess';
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

function activityMeta(type?: string): { author: string; role: string; icon: AppIconName; color: string } {
  switch (type) {
    case 'trading_signal':
      return { author: 'Research Desk', role: 'Head Analyst', icon: 'candlestick', color: colors.success };
    case 'live_session':
      return { author: 'FX Navigators', role: 'Live Sessions', icon: 'video', color: colors.blue };
    case 'course_enrollment':
    case 'lesson_complete':
      return { author: 'FX Navigators', role: 'Teacher', icon: 'book-open', color: colors.cyan };
    case 'certificate':
      return { author: 'FX Navigators', role: 'Certifications', icon: 'award', color: '#A78BFA' };
    default:
      return { author: 'FX Navigators', role: 'Team', icon: 'activity', color: colors.blue };
  }
}

function navigateActivity(router: ReturnType<typeof useRouter>, type?: string) {
  if (type === 'trading_signal') {
    recordQuickAccessRoute('/(app)/signals');
    router.push('/(app)/signals');
  } else if (type === 'live_session') {
    recordQuickAccessRoute('/(app)/live-sessions');
    router.push('/(app)/live-sessions');
  } else if (type === 'course_enrollment' || type === 'lesson_complete') {
    recordQuickAccessRoute('/(app)/progress');
    router.push('/(app)/courses');
  } else if (type === 'certificate') {
    recordQuickAccessRoute('/(app)/certificates');
    router.push('/(app)/certificates');
  } else if (type === 'payment') {
    recordQuickAccessRoute('/(app)/subscription');
    router.push('/(app)/subscription');
  } else if (type === 'referral') {
    recordQuickAccessRoute('/(app)/referrals');
    router.push('/(app)/referrals');
  } else {
    router.push('/(app)/notifications');
  }
}

interface DashboardData {
  enrolledCourses: number;
  totalSignals: number;
  certificates: number;
  courses: NormalizedCourse[];
  recentSignals: NormalizedSignal[];
  recentActivity: ActivityItem[];
  recentNews: NormalizedNews[];
}

function dedupeNews(items: NormalizedNews[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SectionHead({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
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
      const [enrolledRes, catalogRes, signalsRes, certsRes, activityRes, newsRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled'),
        apiFetch('api/courses'),
        apiFetch('api/signals'),
        apiFetch('api/certificates/my-certificates'),
        apiFetch('api/users/activity/recent?limit=5'),
        apiFetch('api/news?limit=3'),
      ]);

      const catalog = catalogRes.status === 'fulfilled' && catalogRes.value.ok
        ? normalizeList<Record<string, unknown>>(await catalogRes.value.json()).map(normalizeCourse)
        : [];

      let courses: NormalizedCourse[] = [];

      if (enrolledRes.status === 'fulfilled' && enrolledRes.value.ok) {
        const list = normalizeList<Record<string, unknown>>(await enrolledRes.value.json()).map(normalizeCourse);
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
                enrolledCourses.map((e) => String(e.courseId ?? '')).filter(Boolean)
              );
              courses = catalog.filter((c) => enrolledIds.has(c._id));
            }
          }
        } catch { /* ignore */ }
      }

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
      const news = newsRes.status === 'fulfilled' && newsRes.value.ok
        ? dedupeNews(normalizeList<Record<string, unknown>>(await newsRes.value.json()).map(normalizeNews))
        : [];

      setData({
        enrolledCourses: courses.length,
        totalSignals: signals.length,
        certificates: certs.length,
        courses: courses.slice(0, 3),
        recentSignals: signals,
        recentActivity: normalizeList<Record<string, unknown>>(activityData.activities ?? activityData)
          .map(normalizeActivity)
          .slice(0, 3),
        recentNews: news.slice(0, 3),
      });
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useFocusEffect(useCallback(() => {
    getStoredUser().then(setUser);
    apiFetch('api/notifications').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        const list: Array<{ read?: boolean }> = d.notifications ?? d ?? [];
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    }).catch(() => {});
  }, []));

  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const firstName = user?.firstName ?? 'Trader';
  const topSignal = data?.recentSignals?.[0];
  const activeSignals = data?.recentSignals?.filter((s) => s.status === 'active').length ?? 0;
  const hasCourses = (data?.courses?.length ?? 0) > 0;

  const quickActions = [
    { id: 'live', icon: 'video' as const, label: 'Live Class', color: colors.blue, onPress: () => router.push('/(app)/live-sessions') },
    { id: 'signals', icon: 'candlestick' as const, label: 'Signals', color: colors.cyan, onPress: () => router.push('/(app)/signals') },
    { id: 'certify', icon: 'award' as const, label: 'Certify', color: '#A78BFA', onPress: () => router.push('/(app)/certificates') },
    { id: 'community', icon: 'users' as const, label: 'Community', color: '#F59E0B', onPress: () => router.push('/(app)/community') },
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <HomeHeader
          profileImage={user?.profileImage}
          hasUnread={unreadCount > 0}
          onNotifications={() => router.push('/(app)/notifications')}
          onProfile={() => router.push('/(app)/profile')}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 48 }} />
        ) : (
          <>
            <WelcomeHeroCard
              firstName={firstName}
              courses={data?.enrolledCourses ?? 0}
              activeSignals={activeSignals}
              certificates={data?.certificates ?? 0}
            />

            <QuickActionRow actions={quickActions} />

            {topSignal ? (
              <View style={styles.section}>
                <SectionHead title="Latest Signal" onSeeAll={() => router.push('/(app)/signals')} />
                <LatestSignalCard
                  pair={topSignal.pair}
                  direction={topSignal.direction}
                  entry={topSignal.entryPrice}
                  takeProfit={topSignal.takeProfit}
                  stopLoss={topSignal.stopLoss}
                  pips={topSignal.pips}
                  status={topSignal.status}
                  createdAt={topSignal.createdAt}
                  onPress={() => router.push('/(app)/signals')}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHead title="My Courses" onSeeAll={() => router.push('/(app)/courses')} />
              {hasCourses ? (
                data!.courses.map((c) => (
                  <HomeCourseCard
                    key={c._id}
                    title={c.title}
                    instructor={c.instructor}
                    progress={c.progress ?? 0}
                    thumbnail={c.thumbnail}
                    lessonCount={c.lessonCount}
                    category={c.level ?? 'Forex'}
                    onPress={() => router.push(`/(app)/course/${c._id}`)}
                  />
                ))
              ) : (
                <Pressable style={styles.emptyCourses} onPress={() => router.push('/(app)/courses')}>
                  <Text style={styles.emptyTitle}>No courses yet</Text>
                  <Text style={styles.emptySub}>Browse the catalog to start learning</Text>
                  <Text style={styles.seeAll}>Browse courses ›</Text>
                </Pressable>
              )}
            </View>

            {(data?.recentNews?.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <SectionHead title="Market News" onSeeAll={() => router.push('/(app)/news')} />
                <View style={styles.newsList}>
                  {data!.recentNews.map((item) => (
                    <NewsCard
                      key={item.url || item.id}
                      item={item}
                      compact
                      onPress={() => openNewsArticle(router, item)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {(data?.recentActivity?.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <SectionHead title="Activity Feed" />
                {data!.recentActivity.map((a) => {
                  const meta = activityMeta(a.type);
                  return (
                    <ActivityFeedCard
                      key={a.id}
                      title={a.title}
                      message={a.message}
                      author={meta.author}
                      role={meta.role}
                      timestamp={a.timestamp}
                      icon={meta.icon}
                      iconColor={meta.color}
                      onPress={() => navigateActivity(router, a.type)}
                    />
                  );
                })}
              </View>
            ) : null}
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
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  section: { marginBottom: 8 },
  newsList: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cyan,
  },
  emptyCourses: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
});
