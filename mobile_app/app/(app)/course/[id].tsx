import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { apiFetch } from '../../../utils/api';
import { getEnrolledCourseIds } from '../../../utils/enrollment';
import { formatInstructor } from '../../../utils/formatInstructor';
import { resolveMediaUrl } from '../../../utils/normalize';

interface ContentItem {
  _id: string;
  title: string;
  type: 'video' | 'text' | 'ppt' | 'quiz' | 'assignment' | 'image';
  duration?: number;
  order?: number;
  isPreview?: boolean;
  videoUrl?: string;
  textContent?: string;
  imageUrl?: string;
  pptUrl?: string;
  quizQuestions?: Array<{
    _id?: string;
    question: string;
    options?: string[];
    type: string;
    correctAnswer?: string;
    explanation?: string;
    points?: number;
  }>;
  assignmentId?: string;
}

interface CourseDetail {
  _id: string;
  title: string;
  description?: string;
  teacher?: { firstName?: string; lastName?: string };
  instructor?: unknown;
  thumbnail?: string;
  level?: string;
  rating?: number;
  content?: ContentItem[];
  videos?: ContentItem[];
  totalDuration?: number;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return h > 0 ? `${h}h ${mins}m` : `${m}m`;
}

const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

type VideoSpec =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'vimeo'; uri: string }
  | { kind: 'html5'; html: string }
  | { kind: 'external'; label: string };

/** Classify a video URL into the best playback strategy. */
function buildVideoSpec(url: string): VideoSpec {
  const u = url.toLowerCase();

  // YouTube → in-app embed with Chrome UA to bypass Error 153
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return { kind: 'youtube', videoId: ytMatch[1] };

  // Vimeo — embed works
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { kind: 'vimeo', uri: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };

  // Zoom / auth-gated
  if (u.includes('zoom.us/')) return { kind: 'external', label: 'Open in Zoom' };

  // Direct / CDN-hosted file → HTML5 <video> in WebView (works on Android + iOS)
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;background:#000;}video{width:100%;height:100%;display:block;}</style></head><body><video src="${url}" controls autoplay playsinline style="width:100vw;height:100vh;"></video></body></html>`;
  return { kind: 'html5', html };
}

/**
 * Very lightweight HTML → React Native renderer.
 * Handles the most common rich-text tags without a WebView.
 */
function HtmlText({ html }: { html: string }) {
  // Normalise line breaks
  const clean = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')           // strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')        // collapse excessive blank lines
    .trim();

  return (
    <View style={htmlStyles.wrap}>
      <Text style={htmlStyles.body} selectable>{clean}</Text>
    </View>
  );
}

const htmlStyles = StyleSheet.create({
  wrap: { padding: 16 },
  body: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 23,
    fontFamily: undefined,
  },
});

const CONTENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  video: 'play-circle-outline',
  text: 'document-text-outline',
  ppt: 'easel-outline',
  quiz: 'help-circle-outline',
  assignment: 'clipboard-outline',
  image: 'image-outline',
};


/** Inline accordion lesson item */
function LessonItem({
  item,
  courseId,
  isEnrolled,
  isOpen,
  onToggle,
}: {
  item: ContentItem;
  courseId: string;
  isEnrolled: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizSyncing, setQuizSyncing] = useState(false);
  const locked = !isEnrolled && !item.isPreview;

  const videoSrc = item.videoUrl ? (resolveMediaUrl(item.videoUrl) ?? item.videoUrl) : null;
  const videoSpec = videoSrc ? buildVideoSpec(videoSrc) : null;

  return (
    <View style={lessonStyles.container}>
      <Pressable
        style={[lessonStyles.row, isOpen && lessonStyles.rowOpen]}
        onPress={locked ? undefined : onToggle}
      >
        <View style={[lessonStyles.icon, isOpen && lessonStyles.iconOpen]}>
          <Ionicons
            name={CONTENT_ICONS[item.type] ?? 'play-circle-outline'}
            size={16}
            color={locked ? 'rgba(255,255,255,0.25)' : isOpen ? '#fff' : '#3AADFF'}
          />
        </View>
        <View style={lessonStyles.info}>
          <Text
            style={[lessonStyles.title, locked && lessonStyles.titleLocked]}
            numberOfLines={isOpen ? undefined : 2}
          >
            {item.title}
          </Text>
          <View style={lessonStyles.meta}>
            <Text style={[lessonStyles.typeLabel, locked && { color: 'rgba(255,255,255,0.2)' }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            {item.duration ? (
              <Text style={lessonStyles.duration}>{formatDuration(item.duration)}</Text>
            ) : null}
          </View>
        </View>
        {locked ? (
          <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.2)" />
        ) : (
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="rgba(58,173,255,0.6)"
          />
        )}
      </Pressable>

      {isOpen && !locked && (
        <View style={lessonStyles.body}>
          {/* VIDEO */}
          {item.type === 'video' && videoSpec?.kind === 'youtube' ? (
            // Load YouTube's own mobile website — this plays without Error 153
            <View style={lessonStyles.videoWrap}>
              <WebView
                source={{ uri: `https://m.youtube.com/watch?v=${videoSpec.videoId}` }}
                style={{ flex: 1 }}
                userAgent={CHROME_UA}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
              />
            </View>
          ) : item.type === 'video' && videoSpec?.kind === 'vimeo' ? (
            <View style={lessonStyles.videoWrap}>
              <WebView
                source={{ uri: videoSpec.uri }}
                style={{ flex: 1 }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                javaScriptEnabled
              />
            </View>
          ) : item.type === 'video' && videoSpec?.kind === 'html5' ? (
            <View style={lessonStyles.videoWrap}>
              <WebView
                source={{ html: videoSpec.html }}
                style={{ flex: 1 }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                javaScriptEnabled
                mixedContentMode="always"
                originWhitelist={['*']}
              />
            </View>
          ) : item.type === 'video' && videoSpec?.kind === 'external' && videoSrc ? (
            <View style={lessonStyles.fallbackWrap}>
              <Ionicons name="play-circle-outline" size={44} color="rgba(58,173,255,0.5)" />
              <Pressable style={lessonStyles.openBtn} onPress={() => Linking.openURL(videoSrc)}>
                <Ionicons name="open-outline" size={14} color="#3AADFF" />
                <Text style={lessonStyles.openBtnText}>{(videoSpec as { label: string }).label}</Text>
              </Pressable>
            </View>
          ) : item.type === 'video' ? (
            <Text style={lessonStyles.noContent}>No video URL available.</Text>
          ) : null}

          {/* TEXT — rendered natively, no WebView, no height glitches */}
          {item.type === 'text' ? (
            <HtmlText html={item.textContent ?? ''} />
          ) : null}

          {/* QUIZ */}
          {item.type === 'quiz' ? (
            <View style={lessonStyles.quizWrap}>
              {(item.quizQuestions ?? []).map((q, qi) => (
                <View key={qi} style={lessonStyles.questionCard}>
                  <Text style={lessonStyles.question}>{qi + 1}. {q.question}</Text>
                  {(q.options ?? []).map((opt, oi) => {
                    const selected = quizAnswers[qi] === opt;
                    const correct = quizSubmitted && opt === q.correctAnswer;
                    const wrong = quizSubmitted && selected && opt !== q.correctAnswer;
                    return (
                      <Pressable
                        key={oi}
                        style={[
                          lessonStyles.option,
                          selected && !quizSubmitted && lessonStyles.optionSelected,
                          correct && lessonStyles.optionCorrect,
                          wrong && lessonStyles.optionWrong,
                        ]}
                        onPress={() => !quizSubmitted && setQuizAnswers((p) => ({ ...p, [qi]: opt }))}
                      >
                        <Text style={lessonStyles.optionText}>{opt}</Text>
                        {correct ? <Ionicons name="checkmark-circle" size={15} color="#4ADE80" /> : null}
                        {wrong ? <Ionicons name="close-circle" size={15} color="#FF5A5A" /> : null}
                      </Pressable>
                    );
                  })}
                  {quizSubmitted && q.explanation ? (
                    <Text style={lessonStyles.explanation}>{q.explanation}</Text>
                  ) : null}
                </View>
              ))}
              {!quizSubmitted ? (
                <Pressable
                  style={lessonStyles.submitBtn}
                  onPress={async () => {
                    setQuizSubmitted(true);
                    if (!isEnrolled || !courseId || !item._id) return;
                    setQuizSyncing(true);
                    try {
                      const answers = Object.entries(quizAnswers).map(([i, answer]) => ({
                        questionId: item.quizQuestions?.[Number(i)]?._id ?? String(i),
                        answer,
                      }));
                      await apiFetch(`api/progress/${courseId}/quiz/${item._id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ answers, timeSpent: 0 }),
                      });
                    } catch { /* best-effort */ }
                    finally { setQuizSyncing(false); }
                  }}
                >
                  <Text style={lessonStyles.submitText}>{quizSyncing ? 'Saving…' : 'Submit'}</Text>
                </Pressable>
              ) : (
                <View style={lessonStyles.result}>
                  <Ionicons name="trophy" size={22} color="#FFC107" />
                  <Text style={lessonStyles.resultText}>
                    {Object.entries(quizAnswers).filter(([i, a]) => item.quizQuestions?.[Number(i)]?.correctAnswer === a).length}
                    /{item.quizQuestions?.length ?? 0} correct
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* IMAGE */}
          {item.type === 'image' && item.imageUrl ? (
            <Image
              source={{ uri: resolveMediaUrl(item.imageUrl) ?? item.imageUrl }}
              style={lessonStyles.lessonImage}
              resizeMode="contain"
            />
          ) : item.type === 'image' ? (
            <Text style={lessonStyles.noContent}>No image available.</Text>
          ) : null}

          {/* PPT */}
          {item.type === 'ppt' && item.pptUrl ? (
            <View style={lessonStyles.pptWrap}>
              <WebView
                source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resolveMediaUrl(item.pptUrl) ?? item.pptUrl)}` }}
                style={{ flex: 1 }}
                javaScriptEnabled
                startInLoadingState
              />
              <Pressable
                style={lessonStyles.openExternalBtn}
                onPress={() => Linking.openURL(resolveMediaUrl(item.pptUrl!) ?? item.pptUrl!)}
              >
                <Ionicons name="open-outline" size={14} color="#3AADFF" />
                <Text style={lessonStyles.openExternalText}>Open in browser</Text>
              </Pressable>
            </View>
          ) : item.type === 'ppt' ? (
            <Text style={lessonStyles.noContent}>No presentation available.</Text>
          ) : null}

          {/* ASSIGNMENT */}
          {item.type === 'assignment' ? (
            <View style={lessonStyles.assignmentWrap}>
              <Ionicons name="clipboard-outline" size={28} color="#3AADFF" />
              <Text style={lessonStyles.assignmentText}>
                Complete this assignment in the Assignments section.
              </Text>
              <Pressable
                style={lessonStyles.assignmentBtn}
                onPress={() => router.push('/(app)/assignments')}
              >
                <Text style={lessonStyles.assignmentBtnText}>Go to Assignments</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          {/* OTHER */}
          {!['video', 'text', 'quiz', 'image', 'ppt', 'assignment'].includes(item.type) ? (
            <Text style={lessonStyles.noContent}>
              This content type ({item.type}) isn't viewable here yet.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const lessonStyles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  rowOpen: {
    backgroundColor: 'rgba(0,96,230,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58,173,255,0.12)',
  },
  icon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(0,96,230,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconOpen: { backgroundColor: 'rgba(0,96,230,0.3)' },
  info: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 13.5, fontWeight: '700', color: '#fff', lineHeight: 19 },
  titleLocked: { color: 'rgba(255,255,255,0.4)' },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  typeLabel: { fontSize: 11, fontWeight: '700', color: '#3AADFF' },
  duration: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  body: { backgroundColor: 'rgba(0,5,15,0.6)', overflow: 'hidden' },
  videoWrap: { width: '100%', height: 300, backgroundColor: '#000' },
  videoThumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 10,
  },
  playBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  tapText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  fallbackWrap: {
    alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 28, paddingHorizontal: 16,
  },
  fallbackText: { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.4)',
    backgroundColor: 'rgba(0,96,230,0.12)',
  },
  openBtnText: { fontSize: 13, fontWeight: '700', color: '#3AADFF' },
  noContent: { padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  quizWrap: { padding: 14, gap: 10 },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.1)',
    padding: 14, gap: 8,
  },
  question: { fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionSelected: { borderColor: '#3AADFF', backgroundColor: 'rgba(0,96,230,0.18)' },
  optionCorrect: { borderColor: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.12)' },
  optionWrong: { borderColor: '#FF5A5A', backgroundColor: 'rgba(255,90,90,0.12)' },
  optionText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 },
  explanation: { fontSize: 11.5, color: 'rgba(74,222,128,0.8)', fontStyle: 'italic', marginTop: 2 },
  submitBtn: {
    backgroundColor: 'rgba(0,96,230,0.3)', borderRadius: 10,
    borderWidth: 1, borderColor: '#3AADFF',
    paddingVertical: 12, alignItems: 'center',
  },
  submitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  result: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)',
    paddingVertical: 12,
  },
  resultText: { fontSize: 15, fontWeight: '800', color: '#FFC107' },
  lessonImage: { width: '100%', height: 220, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  pptWrap: { height: 320, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  openExternalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  openExternalText: { fontSize: 13, fontWeight: '600', color: '#3AADFF' },
  assignmentWrap: { alignItems: 'center', gap: 12, padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  assignmentText: { fontSize: 13.5, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  assignmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,96,230,0.3)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(58,173,255,0.4)' },
  assignmentBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  /** Report to backend when a lesson is opened so progress is tracked. */
  const reportLessonOpen = (lesson: ContentItem) => {
    if (!id || !lesson._id || !isEnrolled) return;
    const type = lesson.type ?? 'text';
    let endpoint: string;
    if (type === 'video') endpoint = `api/progress/${id}/video/${lesson._id}`;
    else if (type === 'text') endpoint = `api/progress/${id}/text/${lesson._id}`;
    else if (type === 'image' || type === 'ppt') endpoint = `api/progress/${id}/text/${lesson._id}`;
    else return;
    apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ completed: true, watchPercentage: 100 }),
    }).catch(() => {/* best-effort */});
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!id) return;
      try {
        const [courseRes, profileRes, localIds] = await Promise.all([
          apiFetch(`api/courses/${id}`),
          apiFetch('api/users/profile/me'),
          getEnrolledCourseIds(),
        ]);
        if (!mounted) return;

        if (courseRes.ok) {
          setCourse(await courseRes.json());
        } else if (courseRes.status === 403) {
          const body = await courseRes.json().catch(() => ({}));
          if ((body as { code?: string }).code === 'PACKAGE_REQUIRED') {
            Alert.alert(
              'Upgrade required',
              (body as { error?: string }).error ?? 'This course is not included in your subscription package.',
              [
                { text: 'Go back', onPress: () => router.back() },
                { text: 'Upgrade', onPress: () => router.push('/subscription-upgrade') },
              ],
            );
          }
        }

        let enrolled = localIds.includes(id);
        if (!enrolled && profileRes.ok) {
          const profile = await profileRes.json();
          const ec = profile?.enrolledCourses as Array<{ courseId?: unknown; progress?: number }> | undefined;
          if (Array.isArray(ec)) {
            const match = ec.find((e) => String(e.courseId ?? '') === id);
            if (match) { enrolled = true; setProgress(match.progress ?? 0); }
          }
        }
        setIsEnrolled(enrolled);
      } catch { /* ignore */ }
      finally { if (mounted) setLoading(false); }
    };
    run();
    return () => { mounted = false; };
  }, [id]);

  const handleEnroll = async () => {
    if (!id || enrolling) return;
    try {
      setEnrolling(true);
      const res = await apiFetch(`api/courses/${id}/enroll`, { method: 'POST' });
      if (res.ok) {
        setIsEnrolled(true);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 403 && (body as { code?: string }).code === 'PACKAGE_REQUIRED') {
        Alert.alert(
          'Upgrade required',
          (body as { error?: string }).error ?? 'This course is not included in your subscription package.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/subscription-upgrade') },
          ],
        );
        return;
      }
      Alert.alert('Enrollment failed', (body as { error?: string }).error ?? 'Could not enroll in this course.');
    } catch { /* ignore */ }
    finally { setEnrolling(false); }
  };

  const instructorName = useMemo(() => formatInstructor(course?.instructor ?? course?.teacher), [course]);
  const thumbnail = resolveMediaUrl(course?.thumbnail);

  const lessons: ContentItem[] = useMemo(() =>
    [...(course?.content ?? []), ...(course?.videos ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [course]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEnrolled ? 'My Course' : 'Course Preview'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
      ) : !course ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={46} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>Course unavailable</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.heroImage} />
            ) : (
              <LinearGradient colors={['rgba(0,96,230,0.25)', 'rgba(255,255,255,0.03)']} style={styles.heroPlaceholder}>
                <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
          </View>

          <Text style={styles.title}>{course.title}</Text>

          {instructorName ? (
            <View style={styles.instructorRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={12} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.instructorText}>{instructorName}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {course.level ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(course.level).toUpperCase()}</Text>
              </View>
            ) : null}
            {typeof course.rating === 'number' && course.rating > 0 ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#FFC107" />
                <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {lessons.length > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.35)" />
                <Text style={styles.metaText}>{lessons.length} lessons</Text>
              </View>
            ) : null}
          </View>

          {/* Progress card */}
          {isEnrolled && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFillBar, { width: `${Math.min(progress, 100)}%` as `${number}%` }]} />
              </View>
            </View>
          )}

          {/* Description */}
          {course.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About This Course</Text>
              <Text style={styles.description}>{course.description}</Text>
            </View>
          ) : null}

          {/* Lessons accordion */}
          {lessons.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Course Content</Text>
              <View style={styles.lessonList}>
                {lessons.map((item, idx) => (
                  <LessonItem
                    key={item._id ?? idx}
                    item={item}
                    courseId={id!}
                    isEnrolled={isEnrolled}
                    isOpen={openLesson === (item._id ?? String(idx))}
                    onToggle={() => {
                      const key = item._id ?? String(idx);
                      const wasOpen = openLesson === key;
                      setOpenLesson(wasOpen ? null : key);
                      if (!wasOpen) reportLessonOpen(item);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Enroll button — only when NOT enrolled */}
          {!isEnrolled ? (
            <LinearGradient
              colors={['#0253BD', '#036FFC']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.enrollGradient}
            >
              <Pressable style={styles.enrollPress} onPress={handleEnroll} disabled={enrolling}>
                <Text style={styles.enrollText}>{enrolling ? 'Enrolling…' : 'Enroll Now'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </LinearGradient>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  hero: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroImage: { width: '100%', height: 200 },
  heroPlaceholder: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, lineHeight: 28 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  instructorText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  badge: {
    backgroundColor: 'rgba(0,96,230,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#3AADFF', letterSpacing: 0.3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '800', color: '#FFC107' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.2)',
    padding: 14, gap: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  progressPct: { fontSize: 13, fontWeight: '800', color: '#3AADFF' },
  progressTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFillBar: { height: '100%', backgroundColor: '#3AADFF', borderRadius: 3 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  description: { fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 21 },
  lessonList: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  enrollGradient: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  enrollPress: { height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  enrollText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  empty: { alignItems: 'center', marginTop: 56, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: 'rgba(255,255,255,0.55)' },
});
