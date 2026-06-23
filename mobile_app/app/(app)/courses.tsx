import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowseCourseCard } from '../../components/BrowseCourseCard';
import { CourseCard } from '../../components/CourseCard';
import { GlassEmptyState } from '../../components/glass/GlassPressable';
import { GlassSurface } from '../../components/glass/GlassSurface';
import { apiFetch } from '../../utils/api';
import { hapticSuccess } from '../../utils/haptics';
import { addEnrolledCourseId, getEnrolledCourseIds } from '../../utils/enrollment';
import { formatInstructor } from '../../utils/formatInstructor';
import { NormalizedCourse, normalizeCourse, normalizeList } from '../../utils/normalize';

type Tab = 'enrolled' | 'browse';

export default function CoursesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('browse');
  const [enrolled, setEnrolled] = useState<NormalizedCourse[]>([]);
  const [catalog, setCatalog] = useState<NormalizedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'rating'>('default');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const fetchCourses = async (force = false): Promise<{ enrolledList: NormalizedCourse[]; catalogList: NormalizedCourse[] }> => {
    const cache = force ? 'reload' : 'default';
    try {
      const [enrolledRes, catalogRes, profileRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled', { cache }),
        apiFetch('api/courses', { cache }),
        apiFetch('api/users/profile/me', { cache }),
      ]);

      let enrolledList: NormalizedCourse[] = [];
      let catalogList: NormalizedCourse[] = [];

      // Always build the full catalog first
      if (catalogRes.status === 'fulfilled' && catalogRes.value.ok) {
        const raw = await catalogRes.value.json();
        catalogList = normalizeList<Record<string, unknown>>(raw).map(normalizeCourse);
      }

      // Strategy 1: dedicated enrolled endpoint (may be blocked by requireVerifiedPayment)
      if (enrolledRes.status === 'fulfilled' && enrolledRes.value.ok) {
        const raw = await enrolledRes.value.json();
        const list = normalizeList<Record<string, unknown>>(raw).map(normalizeCourse);
        if (list.length > 0) {
          enrolledList = list;
        }
      }

      // Strategy 2: cross-reference user profile enrolledCourses against catalog
      // This always works — profile/me only requires authenticateToken
      if (enrolledList.length === 0 && profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const profile = await profileRes.value.json();
        const enrolledCourses = profile?.enrolledCourses as Array<{ courseId?: unknown }> | undefined;
        if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0) {
          const enrolledIds = new Set(
            enrolledCourses.map((e) => String(e.courseId ?? '')).filter(Boolean)
          );
          if (catalogList.length > 0) {
            enrolledList = catalogList.filter((c) => enrolledIds.has(c._id));
          }
        }
      }

      // Strategy 3: local storage fallback (for courses enrolled via mobile app)
      if (enrolledList.length === 0) {
        const ids = await getEnrolledCourseIds();
        if (ids.length > 0 && catalogList.length > 0) {
          enrolledList = catalogList.filter((c) => ids.includes(c._id));
        }
      }

      setEnrolled(enrolledList);
      setCatalog(catalogList);
      if (enrolledList.length > 0) {
        setTab('enrolled');
      }
      return { enrolledList, catalogList };
    } catch {
      return { enrolledList: [], catalogList: [] };
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchCourses(true); }, []);

  const query = search.trim().toLowerCase();

  const displayed = useMemo(() => {
    const source = tab === 'enrolled' ? enrolled : catalog;
    let result = source;
    if (query) {
      result = result.filter((c) => {
        const instructor = formatInstructor(c.instructor) ?? '';
        return c.title.toLowerCase().includes(query) || instructor.toLowerCase().includes(query);
      });
    }
    if (levelFilter !== 'all') {
      result = result.filter((c) => (c.level ?? '').toLowerCase() === levelFilter);
    }
    if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return result;
  }, [enrolled, catalog, tab, query, levelFilter, sortBy]);

  const enroll = useCallback(async (courseId: string) => {
    try {
      const res = await apiFetch(`api/courses/${courseId}/enroll`, { method: 'POST' });
      if (res.ok) {
        await addEnrolledCourseId(courseId);
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        const rawCourse = (body?.course ?? body) as Record<string, unknown>;
        const normalized = normalizeCourse(rawCourse);
        setEnrolled((prev) => {
          const exists = prev.some((c) => c._id === normalized._id);
          return exists ? prev : [normalized, ...prev];
        });
        setCatalog((prev) => prev.filter((c) => c._id !== normalized._id));
        setTab('enrolled');
        // optimistic update is enough; skip redundant network refetch
        if (Platform.OS === 'android') ToastAndroid.show('Enrolled! Redirecting…', ToastAndroid.SHORT);
        await hapticSuccess();
        router.push(`/(app)/course/${courseId}`);
        return;
      }

      // 400 = already enrolled — still send to course
      if (res.status === 400) {
        await addEnrolledCourseId(courseId);
        setTab('enrolled');
        router.push(`/(app)/course/${courseId}`);
        return;
      }

      const d = await res.json().catch(() => ({}));
      const body = d as { message?: string; error?: string; code?: string };
      if (res.status === 403 && body.code === 'PACKAGE_REQUIRED') {
        Alert.alert(
          'Upgrade required',
          body.error ?? 'This course is not included in your subscription package.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription-upgrade') },
          ],
        );
        return;
      }
      const msg = body.message ?? body.error ?? 'Enrollment failed. Please try again.';
      Alert.alert('Enrollment failed', msg);
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  }, []);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <GlassSurface style={styles.headerGlass} contentStyle={styles.headerGlassInner} radius={22}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Courses</Text>
            <Pressable
              style={[styles.searchBtn, showSearch && styles.searchBtnActive]}
              onPress={() => setShowSearch((v) => !v)}
              hitSlop={8}
            >
              <Ionicons name={showSearch ? 'close' : 'search-outline'} size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <TabBtn label="My courses" active={tab === 'enrolled'} onPress={() => setTab('enrolled')} count={enrolled.length} />
            <TabBtn label="Browse" active={tab === 'browse'} onPress={() => setTab('browse')} count={catalog.length} />
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title or instructor"
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </GlassSurface>
      </SafeAreaView>

      <FlatList
        data={loading ? [] : displayed}
        keyExtractor={(item) => item._id}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5}
        maxToRenderPerBatch={6}
        initialNumToRender={8}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          tab === 'browse' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <Pressable
                  key={lvl}
                  style={[styles.filterChip, levelFilter === lvl && styles.filterChipActive]}
                  onPress={() => setLevelFilter(lvl)}
                >
                  <Text style={[styles.filterChipText, levelFilter === lvl && styles.filterChipTextActive]}>
                    {lvl === 'all' ? 'All levels' : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </Text>
                </Pressable>
              ))}
              <View style={styles.filterDivider} />
              {([['default', 'Default'], ['title', 'A–Z'], ['rating', 'Top rated']] as const).map(([val, label]) => (
                <Pressable
                  key={val}
                  style={[styles.filterChip, sortBy === val && styles.filterChipActive]}
                  onPress={() => setSortBy(val)}
                >
                  <Text style={[styles.filterChipText, sortBy === val && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : undefined
        }
        stickyHeaderIndices={tab === 'browse' ? [0] : undefined}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
          ) : (
            <GlassEmptyState
              title={query ? 'No matches found' : tab === 'enrolled' ? 'No courses yet' : 'No courses available'}
              message={
                query
                  ? 'Try a different search term.'
                  : tab === 'enrolled'
                    ? 'Browse our catalog and enroll in a course to get started.'
                    : 'Check back soon for new courses.'
              }
              actionLabel={tab === 'enrolled' && !query ? 'Browse Courses' : undefined}
              onAction={tab === 'enrolled' && !query ? () => setTab('browse') : undefined}
            />
          )
        }
        renderItem={({ item: course }) =>
          tab === 'browse' ? (
            <BrowseCourseCard
              title={course.title}
              instructor={course.instructor}
              instructorImage={course.instructorImage}
              thumbnail={course.thumbnail}
              level={course.level}
              rating={course.rating}
              ctaLabel="Enroll"
              onCtaPress={() => enroll(course._id)}
              onPress={() => router.push(`/(app)/course/${course._id}`)}
            />
          ) : (
            <CourseCard
              title={course.title}
              instructor={course.instructor}
              progress={course.progress ?? 0}
              thumbnail={course.thumbnail}
              lessonCount={course.lessonCount}
              onPress={() => router.push(`/(app)/course/${course._id}`)}
            />
          )
        }
      />
    </View>
  );
}

function TabBtn({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count: number }) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {count > 0 ? (
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerGlass: {
    width: '100%',
  },
  headerGlassInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnActive: {
    opacity: 0.75,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabCount: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(3,111,252,0.35)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
  },
  tabCountTextActive: {
    color: '#fff',
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipActive: {
    borderColor: '#3AADFF',
    backgroundColor: 'rgba(58,173,255,0.14)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  filterChipTextActive: { color: '#3AADFF' },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  separator: { height: 14 },
});
