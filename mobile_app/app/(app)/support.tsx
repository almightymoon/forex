import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../utils/api';
import { hapticSuccess } from '../../utils/haptics';

const CONTACT_METHODS = [
  {
    icon: 'call-outline' as const,
    label: 'Call Us',
    value: '+92 348 8566147',
    sub: 'Mon–Sat, 9AM–6PM (PKT)',
    color: '#4ADE80',
    onPress: () => Linking.openURL('tel:+923488566147'),
  },
  {
    icon: 'logo-whatsapp' as const,
    label: 'WhatsApp',
    value: '+92 348 8566147',
    sub: 'Quick messages welcome',
    color: '#25D366',
    onPress: () => Linking.openURL('https://wa.me/923488566147'),
  },
];

const HOURS = [
  { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM (PKT)' },
  { day: 'Saturday', time: '10:00 AM – 4:00 PM (PKT)' },
  { day: 'Sunday', time: 'Closed' },
];

const INQUIRY_TYPES = [
  { value: 'general', label: 'General inquiry' },
  { value: 'support', label: 'Technical support' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'course', label: 'Course questions' },
  { value: 'withdrawal', label: 'Withdrawal help' },
  { value: 'consultation', label: 'Book consultation' },
];

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  inquiryType: string;
  status: string;
  createdAt: string;
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  open: { color: '#3AADFF', label: 'Open' },
  in_progress: { color: '#FFC107', label: 'In progress' },
  resolved: { color: '#4ADE80', label: 'Resolved' },
  closed: { color: 'rgba(255,255,255,0.4)', label: 'Closed' },
};

export default function SupportScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await apiFetch('api/support/tickets');
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoadingTickets(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSend = async () => {
    if (!subject.trim()) { setError('Please enter a subject.'); return; }
    if (message.trim().length < 20) { setError('Please describe your issue in more detail (at least 20 characters).'); return; }
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const res = await apiFetch('api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          inquiryType: type,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        const num = (d as { ticket?: { ticketNumber?: string } }).ticket?.ticketNumber;
        setSuccess(
          num
            ? `Ticket ${num} submitted! Our team will reply within 24 hours.`
            : 'Your support ticket has been submitted. We will respond within 24 hours.',
        );
        setSubject('');
        setMessage('');
        fetchTickets();
      } else {
        const errs = (d as { errors?: Array<{ msg: string }> }).errors;
        setError(
          errs?.[0]?.msg
            ?? (d as { error?: string; message?: string }).error
            ?? (d as { message?: string }).message
            ?? 'Submission failed. Please try again.',
        );
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Support</Text>
          <Pressable style={styles.faqBtn} onPress={() => router.push('/(app)/faq')}>
            <Ionicons name="help-circle-outline" size={16} color="#3AADFF" />
            <Text style={styles.faqBtnText}>FAQ</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTickets(); }}
              tintColor="#3AADFF"
            />
          }
        >
          <LinearGradient colors={['rgba(0,96,230,0.22)', 'rgba(255,255,255,0.03)']} style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="headset" size={32} color="#3AADFF" />
            </View>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSub}>Submit a ticket below — we typically reply within 24 hours.</Text>
          </LinearGradient>

          {/* My tickets */}
          <Text style={styles.sectionTitle}>My Tickets</Text>
          {loadingTickets ? (
            <ActivityIndicator color="#3AADFF" style={{ marginVertical: 12 }} />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyTickets}>
              <Ionicons name="ticket-outline" size={28} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTicketsText}>No tickets yet. Submit a message below.</Text>
            </View>
          ) : (
            <View style={styles.ticketsCard}>
              {tickets.map((t, idx) => {
                const cfg = STATUS_CFG[t.status] ?? STATUS_CFG.open;
                return (
                  <View key={t._id}>
                    <View style={styles.ticketRow}>
                      <View style={styles.ticketInfo}>
                        <Text style={styles.ticketNumber}>{t.ticketNumber}</Text>
                        <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                        <Text style={styles.ticketDate}>
                          {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: `${cfg.color}18` }]}>
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    {idx < tickets.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.sectionTitle}>Contact Us Directly</Text>
          <View style={styles.contactCard}>
            {CONTACT_METHODS.map((c, idx) => (
              <View key={c.label}>
                <Pressable style={styles.contactRow} onPress={c.onPress}>
                  <View style={[styles.contactIcon, { backgroundColor: `${c.color}18` }]}>
                    <Ionicons name={c.icon} size={20} color={c.color} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>{c.label}</Text>
                    <Text style={styles.contactValue}>{c.value}</Text>
                    <Text style={styles.contactSub}>{c.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
                </Pressable>
                {idx < CONTACT_METHODS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Business Hours</Text>
          <View style={styles.hoursCard}>
            {HOURS.map((h) => (
              <View key={h.day} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{h.day}</Text>
                <Text style={[styles.hoursTime, h.day === 'Sunday' && { color: '#FF5A5A' }]}>{h.time}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Submit a Ticket</Text>
          <View style={styles.formCard}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Inquiry Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                {INQUIRY_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={(v) => { setSubject(v); setError(''); setSuccess(''); }}
                placeholder="What do you need help with?"
                placeholderTextColor="rgba(255,255,255,0.25)"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={message}
                onChangeText={(v) => { setMessage(v.length <= 1000 ? v : message); setError(''); setSuccess(''); }}
                placeholder="Describe your issue in detail."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                textAlignVertical="top"
                numberOfLines={5}
              />
              <Text style={styles.charCount}>{message.length} / 1000</Text>
            </View>

            {error ? (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#FF5A5A" />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.alertBox, styles.successBox]}>
                <Ionicons name="checkmark-circle" size={15} color="#4ADE80" />
                <Text style={[styles.alertText, { color: '#4ADE80' }]}>{success}</Text>
              </View>
            ) : null}

            <LinearGradient colors={['#0253BD', '#036FFC']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sendGradient}>
              <Pressable style={styles.sendPress} onPress={handleSend} disabled={sending}>
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.sendText}>Submit Ticket</Text></>}
              </Pressable>
            </LinearGradient>
          </View>

          <Pressable style={styles.faqShortcut} onPress={() => router.push('/(app)/faq')}>
            <View style={styles.faqShortcutIcon}>
              <Ionicons name="help-circle-outline" size={22} color="#3AADFF" />
            </View>
            <View style={styles.faqShortcutInfo}>
              <Text style={styles.faqShortcutTitle}>Browse FAQ</Text>
              <Text style={styles.faqShortcutSub}>Find instant answers to common questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  faqBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)', backgroundColor: 'rgba(0,96,230,0.1)' },
  faqBtnText: { fontSize: 13, fontWeight: '700', color: '#3AADFF' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  heroCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(58,173,255,0.15)' },
  heroIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(0,96,230,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  emptyTickets: { alignItems: 'center', padding: 20, gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  emptyTicketsText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
  ticketsCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', overflow: 'hidden' },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ticketInfo: { flex: 1, gap: 2, minWidth: 0 },
  ticketNumber: { fontSize: 11, fontWeight: '700', color: '#3AADFF', letterSpacing: 0.3 },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: '#fff' },
  ticketDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  contactCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactInfo: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  contactValue: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  contactSub: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },
  hoursCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', paddingHorizontal: 16, paddingVertical: 6 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  hoursDay: { fontSize: 13.5, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  hoursTime: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  formCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', padding: 18, gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  typeRow: { gap: 8, paddingVertical: 2 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  typeBtnActive: { borderColor: '#3AADFF', backgroundColor: 'rgba(58,173,255,0.14)' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  typeBtnTextActive: { color: '#3AADFF' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, height: 46, fontSize: 14.5, color: '#fff' },
  textarea: { height: 110, paddingTop: 12, paddingBottom: 12 },
  charCount: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: 4 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10, padding: 12 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)' },
  alertText: { flex: 1, fontSize: 13, color: '#FF5A5A', lineHeight: 18 },
  sendGradient: { borderRadius: 13, overflow: 'hidden' },
  sendPress: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  faqShortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(58,173,255,0.15)', padding: 14 },
  faqShortcutIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,96,230,0.15)', alignItems: 'center', justifyContent: 'center' },
  faqShortcutInfo: { flex: 1 },
  faqShortcutTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  faqShortcutSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});
