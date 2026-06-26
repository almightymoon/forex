import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
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
import { apiUpload } from '../utils/api';
import { getStoredUser } from '../utils/auth';
import { hapticSuccess } from '../utils/haptics';

const WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function PaymentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ packageId: string; packageName: string; amount: string }>();
  const { packageName, amount } = params;

  const [txId, setTxId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getStoredUser().then((u) => { if (u?.email) setPayerEmail(u.email); });
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(WALLET_ADDRESS);
    setCopied(true);
    toast('Wallet address copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!packageName) { setError('Package name is missing.'); return; }
    if (!txId.trim() || txId.trim().length < 10) { setError('Transaction ID is required (min 10 characters).'); return; }
    if (!payerName.trim()) { setError('Payer name is required'); return; }
    if (!payerEmail.trim()) { setError('Payer email is required'); return; }
    if (!screenshot) { setError('Payment screenshot is required'); return; }
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('packageName', packageName);
      form.append('transactionId', txId.trim());
      form.append('payerName', payerName.trim());
      form.append('payerEmail', payerEmail.trim());
      form.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.name,
        type: screenshot.type,
      } as unknown as Blob);

      const res = await apiUpload('api/payments/submit-package', form);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        router.replace('/payment-pending');
      } else {
        const errs = (data as { errors?: Array<{ msg: string }> }).errors;
        setError(errs?.[0]?.msg ?? (data as { message?: string; error?: string }).message ?? (data as { error?: string }).error ?? 'Submission failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.header}>
              <Text style={styles.title}>Complete Payment</Text>
              <Text style={styles.subtitle}>Send USDT (TRC20) to the address below then submit your transaction details</Text>
            </View>

            <GlassListCard contentStyle={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Package</Text>
                <Text style={styles.summaryValue}>{packageName ?? '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.amountValue}>{amount} USDT</Text>
              </View>
            </GlassListCard>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>USDT (TRC20) Wallet Address</Text>
              <Pressable style={styles.walletRow} onPress={handleCopy}>
                <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {WALLET_ADDRESS}
                </Text>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#4ADE80' : colors.brandBlue} />
              </Pressable>
              <Text style={styles.walletNote}>Tap to copy. Send exact amount to this address.</Text>
            </View>

            <AuthInput
              label="Transaction ID / Hash"
              icon="receipt-outline"
              placeholder="Paste your transaction ID here"
              autoCapitalize="none"
              autoCorrect={false}
              value={txId}
              onChangeText={(v) => { setTxId(v); setError(''); }}
            />
            <AuthInput
              label="Payer Name"
              icon="person-outline"
              placeholder="Name as shown on your exchange"
              autoCapitalize="words"
              value={payerName}
              onChangeText={(v) => { setPayerName(v); setError(''); }}
            />
            <AuthInput
              label="Payer Email"
              icon="mail-outline"
              placeholder="your@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={payerEmail}
              onChangeText={(v) => { setPayerEmail(v); setError(''); }}
            />
            <PaymentScreenshotPicker value={screenshot} onChange={setScreenshot} />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF5A5A" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <GradientButton title="Submit Payment Proof" loading={loading} onPress={handleSubmit} />

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.noticeText}>
                Your payment will be reviewed within 24 hours. Do not send from an exchange that doesn't support TRC20.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    lineHeight: 20,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandBlue,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.3)',
    padding: 14,
    gap: 10,
  },
  walletAddress: {
    flex: 1,
    fontSize: 13.5,
    color: colors.brandBlue,
    fontWeight: '500',
  },
  walletNote: {
    fontSize: 11.5,
    color: colors.textDim,
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,90,90,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.2)',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF5A5A',
  },
  notice: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 18,
  },
});
}
