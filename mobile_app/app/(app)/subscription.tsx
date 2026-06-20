import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../utils/api';

interface Payment {
  _id: string;
  type?: string;
  status: string;
  amount?: number;
  finalAmount?: number;
  currency?: string;
  package?: { name?: string; price?: number };
  createdAt?: string;
  transactionId?: string;
  paymentMethod?: string;
}

function fmt(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', label: 'Active' },
  pending:   { color: '#FFC107', bg: 'rgba(255,193,7,0.12)',  label: 'Pending' },
  failed:    { color: '#FF5A5A', bg: 'rgba(255,90,90,0.1)',   label: 'Failed' },
  cancelled: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)', label: 'Cancelled' },
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await apiFetch('api/payments/user');
      if (res.ok) {
        const raw = await res.json();
        const list: Payment[] = Array.isArray(raw) ? raw : raw.data ?? raw.payments ?? [];
        setPayments(list);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchPayments(); }, []);

  const packagePayments = payments.filter((p) => !p.type || p.type === 'package');
  const monthlyPayments = payments.filter((p) => p.type === 'monthly_fee');
  const activePackage = packagePayments.find((p) => p.status === 'completed');

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments(); }} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} /> : (
          <>
            {/* Active package card */}
            {activePackage ? (
              <LinearGradient colors={['rgba(0,96,230,0.35)', 'rgba(255,255,255,0.03)']} style={styles.activeCard}>
                <View style={styles.activeGlow} />
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
                <Text style={styles.activePkgName}>
                  {activePackage.package?.name ?? 'FX Navigators'}
                </Text>
                <Text style={styles.activeAmount}>
                  ${(activePackage.finalAmount ?? activePackage.amount ?? 0).toFixed(0)} USDT
                </Text>
                <Text style={styles.activeDate}>Purchased {fmt(activePackage.createdAt)}</Text>

                <View style={styles.featureList}>
                  {['Full course access', 'Live trading sessions', 'Trading signals', 'Community chat', 'Certificates'].map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={14} color="#3AADFF" />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.upgradeBtn} onPress={() => router.push('/subscription-upgrade')}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color="#3AADFF" />
                  <Text style={styles.upgradeText}>Upgrade Package</Text>
                </Pressable>
                <Pressable style={styles.monthlyFeeBtn} onPress={() => router.push('/(app)/monthly-fee')}>
                  <Ionicons name="calendar-outline" size={16} color="#FFC107" />
                  <Text style={styles.monthlyFeeText}>Pay Monthly Fee</Text>
                </Pressable>
              </LinearGradient>
            ) : (
              <View style={styles.noSubCard}>
                <Ionicons name="layers-outline" size={44} color="rgba(255,255,255,0.15)" />
                <Text style={styles.noSubTitle}>No Active Subscription</Text>
                <Text style={styles.noSubText}>Choose a package to get access to all features.</Text>
                <Pressable style={styles.noSubBtn} onPress={() => router.replace('/select-package')}>
                  <Text style={styles.noSubBtnText}>View Packages</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Package payments */}
            {packagePayments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Package History</Text>
                <View style={styles.card}>
                  {packagePayments.map((p, idx) => {
                    const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending;
                    return (
                      <View key={p._id} style={[styles.payRow, idx < packagePayments.length - 1 && styles.payDivider]}>
                        <View style={[styles.payIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name="layers-outline" size={16} color={cfg.color} />
                        </View>
                        <View style={styles.payInfo}>
                          <Text style={styles.payName}>{p.package?.name ?? 'Package'}</Text>
                          <Text style={styles.payDate}>{fmt(p.createdAt)}</Text>
                          {p.transactionId ? (
                            <Text style={styles.payTxId} numberOfLines={1}>TX: {p.transactionId}</Text>
                          ) : null}
                        </View>
                        <View style={styles.payRight}>
                          <Text style={styles.payAmount}>${(p.finalAmount ?? p.amount ?? 0).toFixed(0)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Monthly fees */}
            {monthlyPayments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monthly Fees</Text>
                <View style={styles.card}>
                  {monthlyPayments.map((p, idx) => {
                    const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending;
                    return (
                      <View key={p._id} style={[styles.payRow, idx < monthlyPayments.length - 1 && styles.payDivider]}>
                        <View style={[styles.payIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name="calendar-outline" size={16} color={cfg.color} />
                        </View>
                        <View style={styles.payInfo}>
                          <Text style={styles.payName}>Monthly Fee</Text>
                          <Text style={styles.payDate}>{fmt(p.createdAt)}</Text>
                        </View>
                        <View style={styles.payRight}>
                          <Text style={styles.payAmount}>${(p.finalAmount ?? p.amount ?? 0).toFixed(0)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Support CTA */}
            <Pressable style={styles.supportBtn} onPress={() => Linking.openURL('https://thefxnavigators.com/support')}>
              <Ionicons name="help-circle-outline" size={18} color="#3AADFF" />
              <Text style={styles.supportText}>Need help with billing? Contact support</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </>
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
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  activeCard: {
    borderRadius: 22, padding: 24, gap: 8,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.2)', overflow: 'hidden',
  },
  activeGlow: { position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(58,173,255,0.1)' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)' },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#4ADE80', letterSpacing: 0.8 },
  activePkgName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  activeAmount: { fontSize: 36, fontWeight: '900', color: '#3AADFF', letterSpacing: -0.5 },
  activeDate: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  featureList: { marginTop: 8, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  noSubCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', padding: 32, alignItems: 'center', gap: 10 },
  noSubTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  noSubText: { fontSize: 13.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 20 },
  noSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, height: 46, paddingHorizontal: 20, borderRadius: 13, backgroundColor: 'rgba(0,96,230,0.3)', borderWidth: 1, borderColor: 'rgba(58,173,255,0.4)' },
  noSubBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', paddingHorizontal: 16, paddingVertical: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  payDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  payIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  payInfo: { flex: 1, gap: 2, minWidth: 0 },
  payName: { fontSize: 13.5, fontWeight: '600', color: '#fff' },
  payDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  payTxId: { fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  payRight: { alignItems: 'flex-end', gap: 4 },
  payAmount: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  supportBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14 },
  supportText: { flex: 1, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,96,230,0.2)', borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)' },
  upgradeText: { fontSize: 14, fontWeight: '700', color: '#3AADFF' },
  monthlyFeeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 6, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,193,7,0.12)', borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' },
  monthlyFeeText: { fontSize: 14, fontWeight: '700', color: '#FFC107' },
});
