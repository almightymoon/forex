import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../components/AuthInput';
import { GradientButton } from '../components/GradientButton';
import { PaymentScreenshotPicker, ScreenshotAsset } from '../components/PaymentScreenshotPicker';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassListCard } from '../components/glass/GlassListCard';
import { apiFetch, apiUpload } from '../utils/api';
import { getStoredUser } from '../utils/auth';
import { hapticSuccess } from '../utils/haptics';

const WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

interface Package {
  name: string;
  price: number;
  sortOrder?: number;
}

export default function SubscriptionUpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ packageName?: string; amount?: string }>();
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPkg, setCurrentPkg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [txId, setTxId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getStoredUser();
        if (user?.email) setPayerEmail(user.email);
        const [pkgRes, payRes] = await Promise.all([
          apiFetch('api/packages'),
          apiFetch('api/payments/user'),
        ]);
        let currentSort = 0;
        if (payRes.ok) {
          const raw = await payRes.json();
          const payments = Array.isArray(raw) ? raw : raw.data ?? raw.payments ?? [];
          const active = payments.find((p: { type?: string; status: string }) => (!p.type || p.type === 'package') && p.status === 'completed');
          if (active?.package?.name) {
            setCurrentPkg(active.package.name);
          }
        }
        if (pkgRes.ok) {
          const all: Package[] = await pkgRes.json();
          const active = all.filter((p) => (p as Package & { isActive?: boolean }).isActive !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          const current = active.find((p) => p.name === currentPkg);
          currentSort = current?.sortOrder ?? 0;
          const upgrades = active.filter((p) => (p.sortOrder ?? 0) > currentSort);
          setPackages(upgrades);
          const preselect = params.packageName
            ? upgrades.find((p) => p.name === params.packageName)
            : upgrades[0];
          if (preselect) setSelected(preselect);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(WALLET_ADDRESS);
    setCopied(true);
    toast('Wallet address copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!selected) { setError('Select a package to upgrade to.'); return; }
    if (!txId.trim() || txId.trim().length < 10) { setError('Transaction ID is required (min 10 characters).'); return; }
    if (!payerName.trim()) { setError('Payer name is required.'); return; }
    if (!payerEmail.trim()) { setError('Payer email is required.'); return; }
    if (!screenshot) { setError('Payment screenshot is required.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('targetPackageName', selected.name);
      form.append('transactionId', txId.trim());
      form.append('payerName', payerName.trim());
      form.append('payerEmail', payerEmail.trim());
      form.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.name,
        type: screenshot.type,
      } as unknown as Blob);

      const res = await apiUpload('api/payments/submit-package-upgrade', form);
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        router.replace('/payment-pending');
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

  if (loading) {
    return (
      <ScreenBackground variant="auth">
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 80 }} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable style={styles.backRow} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Text style={styles.title}>Upgrade Package</Text>
            <Text style={styles.subtitle}>
              {currentPkg ? `Current: ${currentPkg}. ` : ''}Select your new tier and submit payment proof.
            </Text>

            {packages.length === 0 ? (
              <GlassListCard contentStyle={styles.noUpgrade}>
                <Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.2)" />
                <Text style={styles.noUpgradeText}>You're already on the top tier — no upgrade available.</Text>
              </GlassListCard>
            ) : (
              <>
                <Text style={styles.sectionLabel}>SELECT PACKAGE</Text>
                {packages.map((p) => (
                  <GlassListCard
                    key={p.name}
                    contentStyle={[styles.pkgCard, selected?.name === p.name && styles.pkgCardSelected]}
                    onPress={() => setSelected(p)}
                  >
                    <Text style={styles.pkgName}>{p.name}</Text>
                    <Text style={styles.pkgPrice}>${p.price} USDT</Text>
                    {selected?.name === p.name ? <Ionicons name="checkmark-circle" size={20} color="#3AADFF" /> : null}
                  </GlassListCard>
                ))}

                <View style={styles.walletSection}>
                  <Text style={styles.sectionLabel}>USDT (TRC20) Wallet</Text>
                  <Pressable style={styles.walletRow} onPress={handleCopy}>
                    <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">{WALLET_ADDRESS}</Text>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#4ADE80' : '#3AADFF'} />
                  </Pressable>
                </View>

                <AuthInput label="Transaction ID / Hash" icon="receipt-outline" placeholder="Paste transaction ID" value={txId} onChangeText={(v) => { setTxId(v); setError(''); }} autoCapitalize="none" />
                <AuthInput label="Payer Name" icon="person-outline" placeholder="Name on exchange" value={payerName} onChangeText={(v) => { setPayerName(v); setError(''); }} autoCapitalize="words" />
                <AuthInput label="Payer Email" icon="mail-outline" placeholder="your@email.com" value={payerEmail} onChangeText={(v) => { setPayerEmail(v); setError(''); }} autoCapitalize="none" keyboardType="email-address" />
                <PaymentScreenshotPicker value={screenshot} onChange={setScreenshot} error={error.includes('screenshot') ? error : undefined} />

                {error && !error.includes('screenshot') ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FF5A5A" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <GradientButton title="Submit Upgrade Payment" loading={submitting} onPress={handleSubmit} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase' },
  pkgCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, gap: 10 },
  pkgCardSelected: {},
  pkgName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },
  pkgPrice: { fontSize: 15, fontWeight: '800', color: '#3AADFF' },
  walletSection: { marginTop: 12, marginBottom: 8 },
  walletRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)', padding: 14, gap: 10 },
  walletAddress: { flex: 1, fontSize: 13.5, color: '#3AADFF', fontWeight: '500' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,90,90,0.2)' },
  errorText: { flex: 1, fontSize: 13, color: '#FF5A5A' },
  noUpgrade: { alignItems: 'center', padding: 40, gap: 12 },
  noUpgradeText: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 21 },
});
