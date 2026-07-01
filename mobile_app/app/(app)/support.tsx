import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useMemo } from 'react';
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
import { MenuStackHeader } from '../../components/navigation/MenuStackHeader';
import { GlassListCard } from '../../components/glass/GlassListCard';
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

const statusCfg = (colors: AppColors): Record<string, { color: string; label: string }> => ({
  open: { color: colors.text, label: 'Open' },
  in_progress: { color: '#FFC107', label: 'In progress' },
  resolved: { color: '#4ADE80', label: 'Resolved' },
  closed: { color: colors.textMuted, label: 'Closed' },
});

export default function SupportScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sendGradientColors = useMemo(
    () => (isDark ? [colors.brandPurple, colors.brandPurpleDeep] : [colors.black, colors.primaryEnd]) as [string, string, ...string[]],
    [isDark, colors.brandPurple, colors.brandPurpleDeep, colors.black, colors.primaryEnd],
  );
  const STATUS_CFG = useMemo(() => statusCfg(colors), [colors]);
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
      <MenuStackHeader
        title="Contact Support"
        subtitle="We're here to help"
        onBack={() => router.back()}
        right={
          <Pressable style={styles.faqBtn} onPress={() => router.push('/(app)/faq')}>
            <Ionicons name="help-circle-outline" size={16} color={colors.text} />
            <Text style={styles.faqBtnText}>FAQ</Text>
          </Pressable>
        }
      />

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
              tintColor={colors.black}
            />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="headset" size={32} color={colors.black} />
            </View>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSub}>Submit a ticket below — we typically reply within 24 hours.</Text>
          </View>

          {/* My tickets */}
          <Text style={styles.sectionTitle}>My Tickets</Text>
          {loadingTickets ? (
            <ActivityIndicator color={colors.black} style={{ marginVertical: 12 }} />
          ) : tickets.length === 0 ? (
            <GlassListCard contentStyle={styles.emptyTickets}>
              <Ionicons name="ticket-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTicketsText}>No tickets yet. Submit a message below.</Text>
            </GlassListCard>
          ) : (
            <GlassListCard contentStyle={styles.ticketsCard}>
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
            </GlassListCard>
          )}

          <Text style={styles.sectionTitle}>Contact Us Directly</Text>
          <GlassListCard contentStyle={styles.contactCard}>
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
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
                {idx < CONTACT_METHODS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </GlassListCard>

          <Text style={styles.sectionTitle}>Business Hours</Text>
          <GlassListCard contentStyle={styles.hoursCard}>
            {HOURS.map((h) => (
              <View key={h.day} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{h.day}</Text>
                <Text style={[styles.hoursTime, h.day === 'Sunday' && { color: '#FF5A5A' }]}>{h.time}</Text>
              </View>
            ))}
          </GlassListCard>

          <Text style={styles.sectionTitle}>Submit a Ticket</Text>
          <GlassListCard contentStyle={styles.formCard}>
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
                placeholderTextColor={colors.textDim}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={message}
                onChangeText={(v) => { setMessage(v.length <= 1000 ? v : message); setError(''); setSuccess(''); }}
                placeholder="Describe your issue in detail."
                placeholderTextColor={colors.textDim}
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

            <LinearGradient colors={sendGradientColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sendGradient}>
              <Pressable style={styles.sendPress} onPress={handleSend} disabled={sending}>
                {sending
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <><Ionicons name="send" size={16} color={colors.primaryForeground} /><Text style={styles.sendText}>Submit Ticket</Text></>}
              </Pressable>
            </LinearGradient>
          </GlassListCard>

          <GlassListCard contentStyle={styles.faqShortcut} onPress={() => router.push('/(app)/faq')}>
            <View style={styles.faqShortcutIcon}>
              <Ionicons name="help-circle-outline" size={22} color={colors.text} />
            </View>
            <View style={styles.faqShortcutInfo}>
              <Text style={styles.faqShortcutTitle}>Browse FAQ</Text>
              <Text style={styles.faqShortcutSub}>Find instant answers to common questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </GlassListCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  faqBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHover },
  faqBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  heroCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  heroIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  heroSub: { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
  emptyTickets: { alignItems: 'center', padding: 20, gap: 8 },
  emptyTicketsText: { fontSize: 13, color: colors.textDim, textAlign: 'center' },
  ticketsCard: { padding: 0 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ticketInfo: { flex: 1, gap: 2, minWidth: 0 },
  ticketNumber: { fontSize: 11, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: colors.text },
  ticketDate: { fontSize: 11, color: colors.textDim },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  contactCard: { padding: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactInfo: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  contactValue: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  contactSub: { fontSize: 11, color: colors.textDim },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
  hoursCard: { paddingHorizontal: 16, paddingVertical: 6 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  hoursDay: { fontSize: 13.5, fontWeight: '500', color: colors.textSilver },
  hoursTime: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  formCard: { padding: 18, gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  typeRow: { gap: 8, paddingVertical: 2 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHover },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.surfaceHover },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeBtnTextActive: { color: colors.text },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 46, fontSize: 14.5, color: colors.text },
  textarea: { height: 110, paddingTop: 12, paddingBottom: 12 },
  charCount: { fontSize: 11, color: colors.textDim, textAlign: 'right', marginTop: 4 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10, padding: 12 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)' },
  alertText: { flex: 1, fontSize: 13, color: '#FF5A5A', lineHeight: 18 },
  sendGradient: { borderRadius: 13, overflow: 'hidden' },
  sendPress: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendText: { fontSize: 15, fontWeight: '800', color: colors.primaryForeground },
  faqShortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  faqShortcutIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center' },
  faqShortcutInfo: { flex: 1 },
  faqShortcutTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  faqShortcutSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
}
