import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../utils/api';
import { resolveMediaUrl } from '../../utils/normalize';

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  category?: string;
  level?: string;
  progress: { percentage: number; completedContent: number; totalContent: number };
  certificateEligible: boolean;
  certificateIssued: boolean;
  lastAccessed?: string;
}

interface Overview {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  eligibleForCertificates: number;
  issuedCertificates: number;
  courses: CourseProgress[];
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[statStyles.pill, { borderColor: `${color}30` }]}>
      <Text style={[statStyles.val, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  pill: { flex: 1, backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  val: { fontSize: 24, fontWeight: '900' },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center' },
});

export default function ProgressScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await apiFetch('api/progress/student/overview');
      if (res.ok) {
        const d = await res.json();
        setOverview(d.overview ?? d);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchOverview(); };

  const levelColor = (l?: string) => {
    if (l === 'advanced') return '#FF5A5A';
    if (l === 'intermediate') return '#FFC107';
    return '#4ADE80';
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Progress</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 60 }} />
        ) : !overview || overview.totalCourses === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bar-chart-outline" size={52} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>No courses enrolled yet</Text>
            <Text style={styles.emptySub}>Enroll in a course to start tracking your progress.</Text>
            <Pressable style={styles.browseBtn} onPress={() => router.push('/(app)/courses')}>
              <Text style={styles.browseBtnText}>Browse Courses</Text>
              <Ionicons name="arrow-forward" size={14} color="#3AADFF" />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill label="Total" value={overview.totalCourses} color="#3AADFF" />
              <StatPill label="Done" value={overview.completedCourses} color="#4ADE80" />
              <StatPill label="In Progress" value={overview.inProgressCourses} color="#FFC107" />
              <StatPill label="Certs" value={overview.issuedCertificates} color="#E879F9" />
            </View>

            {/* Overall completion bar */}
            <View style={styles.overallCard}>
              <View style={styles.overallHeader}>
                <Text style={styles.overallLabel}>Overall Completion</Text>
                <Text style={styles.overallPct}>
                  {overview.totalCourses > 0
                    ? Math.round((overview.completedCourses / overview.totalCourses) * 100)
                    : 0}%
                </Text>
              </View>
              <View style={styles.bigBar}>
                <View
                  style={[
                    styles.bigBarFill,
                    {
                      width: `${overview.totalCourses > 0
                        ? (overview.completedCourses / overview.totalCourses) * 100
                        : 0}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.overallSub}>
                {overview.completedCourses} of {overview.totalCourses} courses completed
              </Text>
            </View>

            {/* Course list */}
            <Text style={styles.sectionTitle}>Course Progress</Text>
            {overview.courses.map((c) => {
              const thumb = resolveMediaUrl(c.courseThumbnail);
              const pct = c.progress.percentage;
              const color = pct >= 100 ? '#4ADE80' : pct > 0 ? '#3AADFF' : 'rgba(255,255,255,0.2)';
              return (
                <Pressable
                  key={c.courseId}
                  style={styles.courseCard}
                  onPress={() => router.push(`/(app)/course/${c.courseId}`)}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="book" size={22} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{c.courseTitle}</Text>
                    <View style={styles.metaRow}>
                      {c.level ? (
                        <Text style={[styles.level, { color: levelColor(c.level) }]}>
                          {c.level.charAt(0).toUpperCase() + c.level.slice(1)}
                        </Text>
                      ) : null}
                      <Text style={styles.lessonCount}>
                        {c.progress.completedContent}/{c.progress.totalContent} lessons
                      </Text>
                    </View>
                    <View style={styles.progressRow}>
                      <View style={styles.bar}>
                        <View style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.pct, { color }]}>{pct}%</Text>
                    </View>
                    {c.certificateIssued && (
                      <View style={styles.certBadge}>
                        <Ionicons name="ribbon" size={11} color="#E879F9" />
                        <Text style={styles.certText}>Certificate Issued</Text>
                      </View>
                    )}
                    {c.certificateEligible && !c.certificateIssued && (
                      <View style={[styles.certBadge, styles.certEligible]}>
                        <Ionicons name="ribbon-outline" size={11} color="#FFC107" />
                        <Text style={[styles.certText, { color: '#FFC107' }]}>Certificate Available</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#00050A' },
  headerSafe: { backgroundColor: 'rgba(0,5,10,0.97)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  emptySub: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', backgroundColor: 'rgba(0,96,230,0.1)' },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: '#3AADFF' },
  statsRow: { flexDirection: 'row', gap: 10 },
  overallCard: { backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 10 },
  overallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  overallPct: { fontSize: 22, fontWeight: '900', color: '#3AADFF' },
  bigBar: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  bigBarFill: { height: '100%', borderRadius: 5, backgroundColor: '#3AADFF' },
  overallSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  courseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12 },
  thumb: { width: 60, height: 60, borderRadius: 12, flexShrink: 0 },
  thumbPlaceholder: { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  courseInfo: { flex: 1, gap: 5 },
  courseTitle: { fontSize: 13.5, fontWeight: '700', color: '#fff', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  level: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  lessonCount: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 11, fontWeight: '800', width: 34, textAlign: 'right' },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(232,121,249,0.1)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  certEligible: { backgroundColor: 'rgba(255,193,7,0.1)' },
  certText: { fontSize: 10, fontWeight: '700', color: '#E879F9' },
});
