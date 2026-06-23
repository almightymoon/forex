import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/AuthInput';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { glassScreenStyles } from '../../components/glass/glassScreenStyles';
import { GradientButton } from '../../components/GradientButton';
import { PaymentScreenshotPicker, ScreenshotAsset } from '../../components/PaymentScreenshotPicker';
import { apiFetch, apiUpload } from '../../utils/api';
import { getStoredUser } from '../../utils/auth';
import { hapticSuccess } from '../../utils/haptics';

const WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

interface MonthlyFeeData {
  policy?: { monthlyFeeAmount?: number; dueForMonth?: string };
  cycleSummary?: {
    obligation?: string;
    amountUsd?: number;
    dueMonthLabel?: string;
    paidForCurrentCycle?: boolean;
    isAccessBlocked?: boolean;
  };
  pendingPayment?: { _id: string; status: string };
}

export default function MonthlyFeeScreen() {
  const router = useRouter();
  const [data, setData] = useState<MonthlyFeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txId, setTxId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await apiFetch('api/payments/monthly-fee');
      if (res.ok) {
        const d: MonthlyFeeData = await res.json();
        setData(d);
        if (d.pendingPayment?._id) {
          setPaymentId(d.pendingPayment._id);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getStoredUser().then((u) => { if (u?.email) setPayerEmail(u.email); });
    loadStatus();
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(WALLET_ADDRESS);
    setCopied(true);
    toast('Wallet address copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const ensurePaymentId = async (): Promise<string | null> => {
    if (paymentId) return paymentId;
    const res = await apiFetch('api/payments/monthly-fee', { method: 'POST' });
    if (!res.ok) return null;
    const d = await res.json();
    const id = d.payment?._id ?? d._id;
    if (id) setPaymentId(id);
    return id ?? null;
  };

  const handleSubmit = async () => {
    if (!txId.trim() || txId.trim().length < 10) { setError('Transaction ID is required (min 10 characters).'); return; }
    if (!payerName.trim()) { setError('Payer name is required'); return; }
    if (!payerEmail.trim()) { setError('Payer email is required'); return; }
    if (!screenshot) { setError('Payment screenshot is required'); return; }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const id = await ensurePaymentId();
      if (!id) {
        setError('Could not create monthly fee payment. Please try again.');
        return;
      }
      const form = new FormData();
      form.append('transactionId', txId.trim());
      form.append('payerName', payerName.trim());
      form.append('payerEmail', payerEmail.trim());
      form.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.name,
        type: screenshot.type,
      } as unknown as Blob);

      const res = await apiUpload(`api/payments/${id}/submit-payment`, form);
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        setSuccess('Payment submitted! Our team will review it within 24 hours.');
        setTxId('');
        setPayerName('');
        setScreenshot(null);
        loadStatus();
      } else {
        const errs = (d as { errors?: Array<{ msg: string }> }).errors;
        setError(errs?.[0]?.msg ?? (d as { message?: string; error?: string }).message ?? (d as { error?: string }).error ?? 'Submission failed.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const obligation = data?.cycleSummary?.obligation;
  const isPaid = obligation === 'paid' || data?.cycleSummary?.paidForCurrentCycle;
  const isAwaiting = obligation === 'awaiting_admin';
  const amount = data?.cycleSummary?.amountUsd ?? data?.policy?.monthlyFeeAmount;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={glassScreenStyles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Monthly Fee</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 60 }} />
        ) : (
          <>
            <LinearGradient
              colors={isPaid ? ['rgba(74,222,128,0.2)', 'rgba(255,255,255,0.03)'] : ['rgba(255,90,90,0.18)', 'rgba(255,255,255,0.03)']}
              style={styles.statusCard}
            >
              <View style={[styles.statusIcon, { backgroundColor: isPaid ? 'rgba(74,222,128,0.2)' : 'rgba(255,90,90,0.15)' }]}>
                <Ionicons name={isPaid ? 'checkmark-circle' : isAwaiting ? 'time-outline' : 'alert-circle'} size={36} color={isPaid ? '#4ADE80' : isAwaiting ? '#FFC107' : '#FF5A5A'} />
              </View>
              <Text style={styles.statusTitle}>
                {isPaid ? 'Monthly Fee Paid' : isAwaiting ? 'Awaiting Admin Review' : 'Monthly Fee Required'}
              </Text>
              {amount ? (
                <Text style={styles.statusAmount}>${Number(amount).toFixed(2)} USDT</Text>
              ) : null}
              {data?.cycleSummary?.dueMonthLabel && !isPaid ? (
                <View style={styles.dueBadge}>
                  <Ionicons name="calendar-outline" size={13} color="#FF5A5A" />
                  <Text style={styles.dueText}>Due: {data.cycleSummary.dueMonthLabel}</Text>
                </View>
              ) : null}
            </LinearGradient>

            {!isPaid && !isAwaiting && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>USDT (TRC20) Wallet Address</Text>
                  <Pressable style={styles.walletRow} onPress={handleCopy}>
                    <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                      {WALLET_ADDRESS}
                    </Text>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#4ADE80' : '#3AADFF'} />
                  </Pressable>
                  <Text style={styles.walletNote}>Tap to copy. Send exact amount via TRC20 network only.</Text>
                </View>

                <GlassListCard contentStyle={styles.formCard}>
                  <Text style={styles.sectionLabel}>PAYMENT PROOF</Text>
                  <AuthInput label="Transaction ID / Hash" icon="receipt-outline" placeholder="Paste your transaction ID" autoCapitalize="none" value={txId} onChangeText={(v) => { setTxId(v); setError(''); }} />
                  <AuthInput label="Payer Name" icon="person-outline" placeholder="Name on exchange" autoCapitalize="words" value={payerName} onChangeText={(v) => { setPayerName(v); setError(''); }} />
                  <AuthInput label="Payer Email" icon="mail-outline" placeholder="your@email.com" autoCapitalize="none" keyboardType="email-address" value={payerEmail} onChangeText={(v) => { setPayerEmail(v); setError(''); }} />
                  <PaymentScreenshotPicker value={screenshot} onChange={setScreenshot} />

                  {error ? (
                    <View style={styles.alertBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#FF5A5A" />
                      <Text style={[styles.alertText, { color: '#FF5A5A' }]}>{error}</Text>
                    </View>
                  ) : null}
                  {success ? (
                    <View style={[styles.alertBox, styles.successBox]}>
                      <Ionicons name="checkmark-circle" size={15} color="#4ADE80" />
                      <Text style={[styles.alertText, { color: '#4ADE80' }]}>{success}</Text>
                    </View>
                  ) : null}

                  <GradientButton title="Submit Payment Proof" loading={submitting} onPress={handleSubmit} />
                </GlassListCard>
              </>
            )}

            {isPaid && (
              <Pressable style={styles.homeBtn} onPress={() => router.replace('/(app)/home')}>
                <LinearGradient colors={['#0253BD', '#036FFC']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.homeBtnGrad}>
                  <Ionicons name="home-outline" size={18} color="#fff" />
                  <Text style={styles.homeBtnText}>Back to Home</Text>
                </LinearGradient>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  statusCard: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 24, alignItems: 'center', gap: 10, overflow: 'hidden' },
  statusIcon: { width: 70, height: 70, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  statusAmount: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,90,90,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  dueText: { fontSize: 12.5, fontWeight: '700', color: '#FF5A5A' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  walletRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', padding: 14, gap: 10 },
  walletAddress: { flex: 1, fontSize: 13.5, color: '#3AADFF', fontWeight: '500' },
  walletNote: { fontSize: 11.5, color: 'rgba(255,255,255,0.3)' },
  formCard: { padding: 16, gap: 4 },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10, padding: 12, marginVertical: 4 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)' },
  alertText: { flex: 1, fontSize: 13 },
  homeBtn: { borderRadius: 14, overflow: 'hidden' },
  homeBtnGrad: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
