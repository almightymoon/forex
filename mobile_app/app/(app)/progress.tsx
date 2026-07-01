import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { ScreenError } from '../../components/ScreenError';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassListCard } from '../../components/glass/GlassListCard';
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

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {  const { colors } = useTheme();
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);

  return (
    <View style={[statStyles.pill, { borderColor: `${color}30` }]}>
      <Text style={[statStyles.val, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
function createStatStyles(colors: AppColors) {
  return StyleSheet.create({
  pill: { flex: 1, backgroundColor: colors.surfaceHover, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  val: { fontSize: 24, fontWeight: '900' },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
});
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingCert, setGeneratingCert] = useState<string | null>(null);

  const generateCertificate = async (courseId: string, courseTitle: string) => {
    if (generatingCert) return;
    setGeneratingCert(courseId);
    try {
      const res = await apiFetch(`api/certificates/generate/${courseId}`, { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        Alert.alert('Certificate Generated!', `Your certificate for "${courseTitle}" has been issued. Check the Certificates tab.`);
        fetchOverview(); // refresh to show certificateIssued
      } else {
        Alert.alert('Generation Failed', (d as { error?: string; message?: string }).error ?? (d as { message?: string }).message ?? 'Could not generate certificate. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setGeneratingCert(null);
    }
  };

  const fetchOverview = async () => {
    setError(null);
    try {
      const res = await apiFetch('api/progress/student/overview');
      if (res.ok) {
        const d = await res.json();
        setOverview(d.overview ?? d);
      } else {
        setError('Unable to load your progress.');
      }
    } catch {
      setError('No connection. Pull down to retry.');
    } finally {
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
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>My Progress</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={{ marginTop: 60 }} />
        ) : error ? (
          <ScreenError message={error} onRetry={fetchOverview} />
        ) : !overview || overview.totalCourses === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bar-chart-outline" size={52} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No courses enrolled yet</Text>
            <Text style={styles.emptySub}>Enroll in a course to start tracking your progress.</Text>
            <Pressable style={styles.browseBtn} onPress={() => router.push('/(app)/courses')}>
              <Text style={styles.browseBtnText}>Browse Courses</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill label="Total" value={overview.totalCourses} color={colors.text} />
              <StatPill label="Done" value={overview.completedCourses} color="#4ADE80" />
              <StatPill label="In Progress" value={overview.inProgressCourses} color="#FFC107" />
              <StatPill label="Certs" value={overview.issuedCertificates} color="#E879F9" />
            </View>

            {/* Overall completion bar */}
            <GlassListCard contentStyle={styles.overallCard}>
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
            </GlassListCard>

            {/* Course list */}
            <Text style={styles.sectionTitle}>Course Progress</Text>
            {overview.courses.map((c) => {
              const thumb = resolveMediaUrl(c.courseThumbnail);
              const pct = c.progress.percentage;
              const color = pct >= 100 ? colors.success : pct > 0 ? colors.blue : colors.textDim;
              return (
                <GlassListCard
                  key={c.courseId}
                  contentStyle={styles.courseCard}
                  onPress={() => router.push(`/(app)/course/${c.courseId}`)}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="book" size={22} color={colors.textMuted} />
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
                      <Pressable
                        style={[styles.certBadge, styles.certEligible, styles.certBtn]}
                        onPress={() => generateCertificate(c.courseId, c.courseTitle)}
                        disabled={generatingCert === c.courseId}
                      >
                        {generatingCert === c.courseId ? (
                          <ActivityIndicator size="small" color="#FFC107" style={{ width: 11, height: 11 }} />
                        ) : (
                          <Ionicons name="ribbon-outline" size={11} color="#FFC107" />
                        )}
                        <Text style={[styles.certText, { color: '#FFC107' }]}>
                          {generatingCert === c.courseId ? 'Generating…' : 'Get Certificate'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </GlassListCard>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  emptySub: { fontSize: 13.5, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHover },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 10 },
  overallCard: { padding: 16, gap: 10 },
  overallHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  overallPct: { fontSize: 22, fontWeight: '900', color: colors.text },
  bigBar: { height: 10, borderRadius: 5, backgroundColor: colors.surface, overflow: 'hidden' },
  bigBarFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  overallSub: { fontSize: 12, color: colors.textDim },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  courseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 60, height: 60, borderRadius: 12, flexShrink: 0 },
  thumbPlaceholder: { backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center' },
  courseInfo: { flex: 1, gap: 5 },
  courseTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  level: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  lessonCount: { fontSize: 11, color: colors.textDim },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 11, fontWeight: '800', width: 34, textAlign: 'right' },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(232,121,249,0.1)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  certEligible: { backgroundColor: 'rgba(255,193,7,0.1)' },
  certBtn: { borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' },
  certText: { fontSize: 10, fontWeight: '700', color: '#E879F9' },
});
}
