import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton } from '../../components/GradientButton';
import { apiFetch, apiUpload } from '../../utils/api';
import { hapticSuccess } from '../../utils/haptics';

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  courseTitle?: string;
  dueDate?: string;
  maxPoints?: number;
  instructions?: string;
  submission?: {
    submittedAt?: string;
    textContent?: string;
    status?: string;
  };
  grade?: number;
  feedback?: string;
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [textContent, setTextContent] = useState('');
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await apiFetch('api/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : data.assignments ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const openSubmit = (a: Assignment) => {
    setSelected(a);
    setTextContent(a.submission?.textContent ?? '');
    setFiles([]);
    setError('');
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (!result.canceled && result.assets) {
      setFiles((prev) => [...prev, ...result.assets]);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!textContent.trim() && files.length === 0) {
      setError('Add text or at least one file.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('textContent', textContent.trim());
      files.forEach((f, i) => {
        form.append('files', {
          uri: f.uri,
          name: f.name ?? `file-${i}`,
          type: f.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      });
      const res = await apiUpload(`api/assignments/${selected._id}/submit`, form);
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        Alert.alert('Submitted', 'Your assignment has been submitted successfully.');
        setSelected(null);
        fetchAssignments();
      } else {
        setError((d as { error?: string; message?: string }).error ?? (d as { message?: string }).message ?? 'Submission failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (a: Assignment) => {
    if (a.grade != null) return '#4ADE80';
    if (a.submission?.submittedAt) return '#FFC107';
    if (a.dueDate && new Date(a.dueDate) < new Date()) return '#FF5A5A';
    return '#3AADFF';
  };

  const statusLabel = (a: Assignment) => {
    if (a.grade != null) return `Graded: ${a.grade}${a.maxPoints ? `/${a.maxPoints}` : ''}`;
    if (a.submission?.submittedAt) return 'Submitted';
    if (a.dueDate && new Date(a.dueDate) < new Date()) return 'Overdue';
    return 'Pending';
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Assignments</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAssignments(); }} tintColor="#3AADFF" />}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 60 }} />
        ) : assignments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptyText}>Assignments from your enrolled courses will appear here.</Text>
          </View>
        ) : (
          assignments.map((a) => (
            <View key={a._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(a)}18` }]}>
                  <Text style={[styles.statusText, { color: statusColor(a) }]}>{statusLabel(a)}</Text>
                </View>
                {a.dueDate ? (
                  <Text style={styles.dueText}>Due {new Date(a.dueDate).toLocaleDateString()}</Text>
                ) : null}
              </View>
              <Text style={styles.cardTitle}>{a.title}</Text>
              {a.courseTitle ? <Text style={styles.courseName}>{a.courseTitle}</Text> : null}
              {a.description ? <Text style={styles.desc} numberOfLines={3}>{a.description}</Text> : null}
              {a.feedback ? (
                <View style={styles.feedbackBox}>
                  <Ionicons name="chatbubble-outline" size={14} color="#3AADFF" />
                  <Text style={styles.feedbackText}>{a.feedback}</Text>
                </View>
              ) : null}
              {!a.submission?.submittedAt || a.grade == null ? (
                <Pressable style={styles.submitBtn} onPress={() => openSubmit(a)}>
                  <LinearGradient colors={['#0253BD', '#036FFC']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.submitGrad}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.submitText}>{a.submission?.submittedAt ? 'Resubmit' : 'Submit'}</Text>
                  </LinearGradient>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        <View style={modal.screen}>
          <View style={modal.header}>
            <Text style={modal.title} numberOfLines={1}>{selected?.title}</Text>
            <Pressable onPress={() => setSelected(null)}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.content} keyboardShouldPersistTaps="handled">
            {selected?.instructions ? (
              <View style={modal.instructionsBox}>
                <Text style={modal.instructionsLabel}>Instructions</Text>
                <Text style={modal.instructionsText}>{selected.instructions}</Text>
              </View>
            ) : null}
            <Text style={modal.fieldLabel}>Your Response</Text>
            <TextInput
              style={modal.textarea}
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Write your answer here..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              textAlignVertical="top"
            />
            <Pressable style={modal.fileBtn} onPress={pickFiles}>
              <Ionicons name="attach-outline" size={18} color="#3AADFF" />
              <Text style={modal.fileBtnText}>Attach files ({files.length})</Text>
            </Pressable>
            {files.map((f, i) => (
              <View key={i} style={modal.fileRow}>
                <Ionicons name="document-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={modal.fileName} numberOfLines={1}>{f.name}</Text>
                <Pressable onPress={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={18} color="#FF5A5A" />
                </Pressable>
              </View>
            ))}
            {error ? <Text style={modal.error}>{error}</Text> : null}
            <GradientButton title="Submit Assignment" loading={submitting} onPress={handleSubmit} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dueText: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  courseName: { fontSize: 12.5, color: '#3AADFF', fontWeight: '600' },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19 },
  feedbackBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,96,230,0.1)', borderRadius: 10, padding: 10 },
  feedbackText: { flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  submitBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  submitGrad: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

const modal = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', marginRight: 12 },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  instructionsBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, gap: 6 },
  instructionsLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' },
  instructionsText: { fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  textarea: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 14, minHeight: 120, fontSize: 14.5, color: '#fff' },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', backgroundColor: 'rgba(0,96,230,0.1)' },
  fileBtnText: { fontSize: 14, fontWeight: '600', color: '#3AADFF' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  fileName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  error: { fontSize: 13, color: '#FF5A5A' },
});
