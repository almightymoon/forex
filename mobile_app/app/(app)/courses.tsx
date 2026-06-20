import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowseCourseCard } from '../../components/BrowseCourseCard';
import { CourseCard } from '../../components/CourseCard';
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

  const fetchCourses = async (): Promise<{ enrolledList: NormalizedCourse[]; catalogList: NormalizedCourse[] }> => {
    try {
      const [enrolledRes, catalogRes, profileRes] = await Promise.allSettled([
        apiFetch('api/courses/enrolled'),
        apiFetch('api/courses'),
        apiFetch('api/users/profile/me'),
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
  const onRefresh = () => { setRefreshing(true); fetchCourses(); };

  const query = search.trim().toLowerCase();
  const filterCourses = (list: NormalizedCourse[]) => {
    let result = list;
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
  };

  const displayed = tab === 'enrolled' ? filterCourses(enrolled) : filterCourses(catalog);

  const enroll = async (courseId: string) => {
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
        fetchCourses();
        if (Platform.OS === 'android') ToastAndroid.show('Enrolled! Redirecting…', ToastAndroid.SHORT);
        await hapticSuccess();
        router.push(`/(app)/course/${courseId}`);
        return;
      }

      // 400 = already enrolled — still send to course
      if (res.status === 400) {
        await addEnrolledCourseId(courseId);
        setTab('enrolled');
        fetchCourses();
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
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleBlock}>
              <Text style={styles.pageTitle}>
                {tab === 'browse' ? 'Browse Courses' : 'My Courses'}
              </Text>
              {tab === 'browse' && (
                <Text style={styles.subtitle}>
                  Expert-led courses designed to accelerate your forex trading journey.
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
                onPress={() => setShowSearch((v) => !v)}
              >
                <Ionicons name="search-outline" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {showSearch && (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search courses..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.tabs}>
          <TabBtn label="My Courses" active={tab === 'enrolled'} onPress={() => setTab('enrolled')} count={enrolled.length} />
          <TabBtn label="Browse" active={tab === 'browse'} onPress={() => setTab('browse')} count={catalog.length} />
        </View>

        {tab === 'browse' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
        )}
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>
              {query ? 'No matches found' : tab === 'enrolled' ? 'No courses yet' : 'No courses available'}
            </Text>
            <Text style={styles.emptyText}>
              {query
                ? 'Try a different search term.'
                : tab === 'enrolled'
                  ? 'Browse our catalog and enroll in a course to get started.'
                  : 'Check back soon for new courses.'}
            </Text>
            {tab === 'enrolled' && !query && (
              <Pressable onPress={() => setTab('browse')}>
                <Text style={styles.emptyAction}>Browse Courses</Text>
              </Pressable>
            )}
          </View>
        ) : tab === 'browse' ? (
          <View style={styles.list}>
            {displayed.map((course) => (
              <BrowseCourseCard
                key={course._id}
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
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {displayed.map((course) => (
              <CourseCard
                key={course._id}
                title={course.title}
                instructor={course.instructor}
                progress={course.progress ?? 0}
                thumbnail={course.thumbnail}
                lessonCount={course.lessonCount}
                onPress={() => router.push(`/(app)/course/${course._id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TabBtn({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count: number }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      {active ? (
        <LinearGradient colors={['#0253BD', '#036FFC']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.tabActive}>
          <Text style={styles.tabTextActive}>{label}</Text>
          <View style={styles.tabCount}><Text style={styles.tabCountText}>{count}</Text></View>
        </LinearGradient>
      ) : (
        <View style={styles.tabInactive}>
          <Text style={styles.tabText}>{label}</Text>
          {count > 0 && <View style={styles.tabCountDim}><Text style={styles.tabCountDimText}>{count}</Text></View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, gap: 6 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 19 },
  headerActions: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBtnActive: {
    borderColor: 'rgba(58,173,255,0.45)',
    backgroundColor: 'rgba(0,96,230,0.15)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 14, gap: 10 },
  filterRow: { paddingHorizontal: 18, paddingBottom: 12, gap: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterChipActive: { borderColor: '#3AADFF', backgroundColor: 'rgba(58,173,255,0.14)' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  filterChipTextActive: { color: '#3AADFF' },
  filterDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  tabBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  tabActive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, gap: 6, borderRadius: 12 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, gap: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  tabTextActive: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  tabCount: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  tabCountDim: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountDimText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
  list: { gap: 14 },
  empty: { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
  emptyAction: { fontSize: 14, fontWeight: '700', color: '#3AADFF', marginTop: 8 },
});
