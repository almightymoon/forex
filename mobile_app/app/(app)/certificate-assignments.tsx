import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';
import { hapticSuccess } from '../../utils/haptics';
import { resolveMediaUrl } from '../../utils/normalize';
import { primaryButtonGradient } from '../../utils/primaryButton';

interface CertAssignment {
  _id: string;
  status: string;
  message?: string;
  dueDate?: string;
  teacherCertificateId?: {
    title?: string;
    description?: string;
    certificateUrl?: string;
  };
  courseId?: { title?: string };
  studentNotes?: string;
}

export default function CertificateAssignmentsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const completeGradientColors = useMemo(() => primaryButtonGradient(isDark), [isDark]);
  const router = useRouter();
  const [assignments, setAssignments] = useState<CertAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiFetch('api/certificate-assignments/student');
      if (res.ok) {
        const d = await res.json();
        const list: CertAssignment[] = d.assignments ?? [];
        setAssignments(list);
        list.forEach((a) => {
          if (a.status === 'assigned') {
            apiFetch(`api/certificate-assignments/${a._id}/view`, { method: 'PUT' }).catch(() => {});
          }
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const markComplete = async (id: string) => {
    setCompleting(id);
    try {
      const res = await apiFetch(`api/certificate-assignments/${id}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ studentNotes: notes[id]?.trim() || undefined }),
      });
      if (res.ok) {
        await hapticSuccess();
        Alert.alert('Completed', 'Certificate assignment marked as complete.');
        fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        Alert.alert('Error', (d as { message?: string }).message ?? 'Could not complete assignment.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  const statusCfg: Record<string, { color: string; label: string }> = {
    assigned: { color: colors.text, label: 'New' },
    viewed: { color: '#FFC107', label: 'Viewed' },
    completed: { color: '#4ADE80', label: 'Completed' },
    overdue: { color: '#FF5A5A', label: 'Overdue' },
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Certificate Tasks</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.black} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={{ marginTop: 60 }} />
        ) : assignments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No certificate tasks</Text>
            <Text style={styles.emptyText}>Your teacher will assign certificates here when ready.</Text>
          </View>
        ) : (
          assignments.map((a) => {
            const cfg = statusCfg[a.status] ?? statusCfg.assigned;
            const cert = a.teacherCertificateId;
            const title = cert?.title ?? 'Certificate Assignment';
            return (
              <GlassListCard key={a._id} contentStyle={styles.card}>
                <View style={[styles.badge, { backgroundColor: `${cfg.color}18` }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={styles.title}>{title}</Text>
                {a.courseId?.title ? <Text style={styles.course}>{a.courseId.title}</Text> : null}
                {a.message ? <Text style={styles.message}>{a.message}</Text> : null}
                {cert?.description ? <Text style={styles.desc}>{cert.description}</Text> : null}
                {a.dueDate ? (
                  <Text style={styles.due}>Due: {new Date(a.dueDate).toLocaleDateString()}</Text>
                ) : null}
                {cert?.certificateUrl ? (
                  <Pressable
                    style={styles.viewCertBtn}
                    onPress={() => {
                      const url = resolveMediaUrl(cert.certificateUrl);
                      if (url) router.push({ pathname: '/(app)/certificates', params: {} } as any);
                    }}
                  >
                    <Ionicons name="document-outline" size={16} color={colors.text} />
                    <Text style={styles.viewCertText}>View in Certificates</Text>
                  </Pressable>
                ) : null}
                {a.status !== 'completed' ? (
                  <>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Optional notes for your teacher..."
                      placeholderTextColor={colors.textDim}
                      value={notes[a._id] ?? ''}
                      onChangeText={(v) => setNotes((p) => ({ ...p, [a._id]: v }))}
                      multiline
                    />
                    <Pressable style={styles.completeBtn} onPress={() => markComplete(a._id)} disabled={completing === a._id}>
                      <LinearGradient colors={completeGradientColors} style={styles.completeGrad}>
                        {completing === a._id ? (
                          <ActivityIndicator color={colors.primaryForeground} size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.primaryForeground} />
                            <Text style={styles.completeText}>Mark Complete</Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </>
                ) : a.studentNotes ? (
                  <Text style={styles.completedNotes}>Your notes: {a.studentNotes}</Text>
                ) : null}
              </GlassListCard>
            );
          })
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
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  emptyText: { fontSize: 13.5, color: colors.textDim, textAlign: 'center', paddingHorizontal: 20 },
  card: { padding: 16, gap: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  course: { fontSize: 12.5, color: colors.text, fontWeight: '600' },
  message: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  due: { fontSize: 12, color: '#FFC107', fontWeight: '600' },
  viewCertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  viewCertText: { fontSize: 13, fontWeight: '700', color: colors.text },
  notesInput: { backgroundColor: colors.surfaceHover, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, minHeight: 60, fontSize: 13.5, color: colors.text, marginTop: 4 },
  completeBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  completeGrad: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeText: { fontSize: 14, fontWeight: '800', color: colors.primaryForeground },
  completedNotes: { fontSize: 12.5, color: colors.textMuted, fontStyle: 'italic' },
});
}
