import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
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

interface Certificate {
  id: string;
  certificateId: string;
  courseTitle: string;
  instructorName?: string;
  studentName?: string;
  completionDate?: string;
  completionPercentage?: number;
  certificateUrl?: string;
  validUntil?: string;
  course?: { title?: string; thumbnail?: string };
}

function fmt(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CertificatesScreen() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await apiFetch('api/certificates/my-certificates');
      if (res.ok) {
        const d = await res.json();
        setCerts(d.certificates ?? d ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Certificates</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{certs.length}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
        ) : certs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="ribbon-outline" size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptyText}>
              Complete a course to earn your certificate. Keep going!
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(app)/courses')}>
              <Text style={styles.emptyBtnText}>Browse Courses</Text>
              <Ionicons name="arrow-forward" size={14} color="#3AADFF" />
            </Pressable>
          </View>
        ) : (
          certs.map((cert) => {
            const thumb = resolveMediaUrl(cert.course?.thumbnail);
            const certUrl = resolveMediaUrl(cert.certificateUrl) ?? cert.certificateUrl;
            return (
              <View key={cert.id} style={styles.certCard}>
                {/* Top gradient strip */}
                <LinearGradient colors={['#0253BD', '#036FFC']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.certStrip} />

                <View style={styles.certBody}>
                  {/* Thumbnail */}
                  <View style={styles.thumbWrap}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumbImg} />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Ionicons name="school-outline" size={26} color="#3AADFF" />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.certInfo}>
                    <View style={styles.certBadge}>
                      <Ionicons name="ribbon" size={12} color="#A78BFA" />
                      <Text style={styles.certBadgeText}>CERTIFICATE</Text>
                    </View>
                    <Text style={styles.certTitle} numberOfLines={2}>{cert.courseTitle}</Text>
                    {cert.instructorName ? (
                      <Text style={styles.certInstructor}>{cert.instructorName}</Text>
                    ) : null}

                    {/* Details */}
                    <View style={styles.certMeta}>
                      {cert.completionDate ? (
                        <View style={styles.certMetaItem}>
                          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.35)" />
                          <Text style={styles.certMetaText}>{fmt(cert.completionDate)}</Text>
                        </View>
                      ) : null}
                      {cert.completionPercentage != null ? (
                        <View style={styles.certMetaItem}>
                          <Ionicons name="checkmark-circle-outline" size={12} color="#4ADE80" />
                          <Text style={[styles.certMetaText, { color: '#4ADE80' }]}>{cert.completionPercentage}% complete</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View style={styles.certActions}>
                      {certUrl ? (
                        <Pressable style={styles.downloadBtn} onPress={() => Linking.openURL(certUrl)}>
                          <Ionicons name="download-outline" size={14} color="#fff" />
                          <Text style={styles.downloadText}>Download</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.viewBtn}
                        onPress={() => {
                          const verifyUrl = `https://thefxnavigators.com/verify/${cert.certificateId}`;
                          Linking.openURL(verifyUrl);
                        }}
                      >
                        <Ionicons name="open-outline" size={13} color="#3AADFF" />
                        <Text style={styles.viewBtnText}>Verify</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Certificate ID */}
                <View style={styles.certFooter}>
                  <Text style={styles.certIdLabel}>Certificate ID</Text>
                  <Text style={styles.certId}>{cert.certificateId}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  countBadge: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 15, fontWeight: '800', color: '#A78BFA' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  certCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    overflow: 'hidden',
  },
  certStrip: { height: 4 },
  certBody: { flexDirection: 'row', gap: 14, padding: 16 },
  thumbWrap: { width: 80, height: 80, borderRadius: 14, overflow: 'hidden', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(0,96,230,0.2)', alignItems: 'center', justifyContent: 'center' },
  certInfo: { flex: 1, gap: 6, minWidth: 0 },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  certBadgeText: { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 0.5 },
  certTitle: { fontSize: 14.5, fontWeight: '700', color: '#fff', lineHeight: 20 },
  certInstructor: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  certMeta: { gap: 4 },
  certMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  certMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  certActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,96,230,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)' },
  downloadText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', backgroundColor: 'rgba(58,173,255,0.08)' },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: '#3AADFF' },
  certFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  certIdLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8, textTransform: 'uppercase' },
  certId: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  empty: { alignItems: 'center', marginTop: 60, gap: 14, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(167,139,250,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)', backgroundColor: 'rgba(0,96,230,0.12)' },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#3AADFF' },
});
