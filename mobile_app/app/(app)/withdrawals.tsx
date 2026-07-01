import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { primaryButtonGradient } from '../../utils/primaryButton';

interface Withdrawal {
  _id: string;
  amount: number;
  currency?: string;
  walletAddress: string;
  network?: string;
  status: 'pending' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  rejectionReason?: string;
}

interface Profile { balance?: number; }

const withdrawalStatus = (colors: AppColors) => ({
  pending:   { label: 'Pending',   color: '#FFC107', bg: 'rgba(255,193,7,0.12)',    icon: 'time-outline' as const },
  completed: { label: 'Completed', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)',   icon: 'checkmark-circle-outline' as const },
  rejected:  { label: 'Rejected',  color: '#FF5A5A', bg: 'rgba(255,90,90,0.12)',    icon: 'close-circle-outline' as const },
  cancelled: { label: 'Cancelled', color: colors.textDim, bg: colors.surfaceHover, icon: 'ban-outline' as const },
});

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WithdrawalsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const submitGradientColors = useMemo(() => primaryButtonGradient(isDark), [isDark]);
  const STATUS = useMemo(() => withdrawalStatus(colors), [colors]);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({});
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minAmount, setMinAmount] = useState(30);

  // Form
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [profileRes, withdrawalsRes, minRes] = await Promise.allSettled([
        apiFetch('api/users/profile/me'),
        apiFetch('api/withdrawals/user'),
        apiFetch('api/withdrawals/min'),
      ]);
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        setProfile(await profileRes.value.json());
      }
      if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value.ok) {
        const d = await withdrawalsRes.value.json();
        setWithdrawals(Array.isArray(d) ? d : d.withdrawals ?? []);
      }
      if (minRes.status === 'fulfilled' && minRes.value.ok) {
        const d = await minRes.value.json();
        setMinAmount(d.minWithdrawalAmount ?? 30);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleWithdraw = async () => {
    setError(''); setSuccess('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
    if (!wallet.trim()) { setError('Enter your USDT wallet address.'); return; }
    if (amt < minAmount) { setError(`Minimum withdrawal is $${minAmount}.`); return; }
    if (amt > (profile.balance ?? 0)) { setError('Insufficient balance.'); return; }

    setSubmitting(true);
    try {
      const res = await apiFetch('api/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, walletAddress: wallet.trim(), network: 'TRC20' }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess('Withdrawal request submitted! Admin will process it shortly.');
        setAmount(''); setWallet('');
        fetchAll();
      } else {
        setError((d as { message?: string }).message ?? 'Request failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelWithdrawal = async (id: string) => {
    Alert.alert('Cancel Withdrawal', 'Are you sure you want to cancel this withdrawal request?', [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Cancel Request', style: 'destructive',
        onPress: async () => {
          setCancellingId(id);
          try {
            const res = await apiFetch(`api/withdrawals/${id}/cancel`, { method: 'POST' });
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
              setSuccess('Withdrawal cancelled.');
              fetchAll();
            } else {
              setError((d as { message?: string }).message ?? 'Could not cancel. Try again.');
            }
          } catch {
            setError('Network error. Please try again.');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const balance = profile.balance ?? 0;

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Withdrawals" subtitle="USDT payouts" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.black} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} /> : (
            <>
              {/* Balance card */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceIconWrap}>
                  <Ionicons name="wallet" size={26} color={colors.text} />
                </View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
                <Text style={styles.balanceSub}>USDT (TRC20) · Min withdrawal ${minAmount}</Text>
              </View>

              {/* Withdraw form */}
              <GlassListCard contentStyle={styles.card}>
                <Text style={styles.cardTitle}>Request Withdrawal</Text>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Amount (USDT)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder={`Min $${minAmount}`}
                      placeholderTextColor={colors.textDim}
                      keyboardType="decimal-pad"
                    />
                    <Pressable style={styles.maxBtn} onPress={() => setAmount(balance.toFixed(2))}>
                      <Text style={styles.maxBtnText}>MAX</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Your USDT (TRC20) Wallet Address</Text>
                  <TextInput
                    style={styles.input}
                    value={wallet}
                    onChangeText={setWallet}
                    placeholder="Enter your TRC20 USDT address"
                    placeholderTextColor={colors.textDim}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.fieldHint}>
                    Withdrawals are sent on the Tron (TRC20) network only. Do not use ERC20 or BEP20 addresses.
                  </Text>
                </View>

                <View style={styles.networkBadge}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.text} />
                  <Text style={styles.networkBadgeText}>Network: TRC20 (Tron)</Text>
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

                <LinearGradient colors={submitGradientColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.submitGradient}>
                  <Pressable style={styles.submitPress} onPress={handleWithdraw} disabled={submitting || balance <= 0}>
                    {submitting
                      ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                      : <><Ionicons name="arrow-up-circle-outline" size={18} color={colors.primaryForeground} /><Text style={styles.submitText}>Submit Request</Text></>}
                  </Pressable>
                </LinearGradient>
              </GlassListCard>

              {/* History */}
              {withdrawals.length > 0 ? (
                <GlassListCard contentStyle={styles.card}>
                  <Text style={styles.cardTitle}>History</Text>
                  {withdrawals.map((w, idx) => {
                    const cfg = STATUS[w.status] ?? STATUS.pending;
                    return (
                      <View key={w._id} style={[styles.historyRow, idx < withdrawals.length - 1 && styles.historyDivider]}>
                        <View style={[styles.historyIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyAddress} numberOfLines={1}>{w.walletAddress}</Text>
                          <Text style={styles.historyMeta}>TRC20 · {fmt(w.createdAt)}</Text>
                          {w.rejectionReason ? <Text style={styles.historyReason}>{w.rejectionReason}</Text> : null}
                        </View>
                        <View style={styles.historyRight}>
                          <Text style={[styles.historyAmount, { color: cfg.color }]}>-${w.amount.toFixed(2)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          {w.status === 'pending' && (
                            <Pressable
                              style={styles.cancelBtn}
                              onPress={() => cancelWithdrawal(w._id)}
                              disabled={cancellingId === w._id}
                            >
                              {cancellingId === w._id
                                ? <ActivityIndicator size="small" color="#FF5A5A" />
                                : <Text style={styles.cancelText}>Cancel</Text>}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </GlassListCard>
              ) : !loading ? (
                <View style={styles.empty}>
                  <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No withdrawals yet</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  balanceCard: {
    borderRadius: 22, padding: 24, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  balanceIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  balanceLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  balanceValue: { fontSize: 36, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  balanceSub: { fontSize: 12, color: colors.textDim },
  card: { padding: 18, gap: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 46, fontSize: 15, color: colors.text,
  },
  maxBtn: { height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  maxBtnText: { fontSize: 12, fontWeight: '800', color: colors.text },
  fieldHint: { fontSize: 11, color: colors.textDim, lineHeight: 16 },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkBadgeText: { fontSize: 13, fontWeight: '700', color: colors.text },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10, padding: 12 },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)' },
  alertText: { flex: 1, fontSize: 13, color: '#FF5A5A' },
  submitGradient: { borderRadius: 13, overflow: 'hidden' },
  submitPress: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontSize: 15, fontWeight: '800', color: colors.primaryForeground },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  historyDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  historyInfo: { flex: 1, gap: 2, minWidth: 0 },
  historyAddress: { fontSize: 13, fontWeight: '600', color: colors.text },
  historyMeta: { fontSize: 11, color: colors.textDim },
  historyReason: { fontSize: 11, color: '#FF5A5A', fontStyle: 'italic' },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: 15, fontWeight: '800' },
  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cancelBtn: {
    marginTop: 4, height: 26, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: 'rgba(255,90,90,0.1)', borderWidth: 1, borderColor: 'rgba(255,90,90,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 11, fontWeight: '700', color: '#FF5A5A' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  emptyText: { fontSize: 14, color: colors.textDim, fontWeight: '500' },
});
}
