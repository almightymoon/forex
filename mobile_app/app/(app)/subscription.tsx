import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
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
import { MenuStackHeader } from '../../components/navigation/MenuStackHeader';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';

interface Perk {
  key: string;
  description: string;
  enabled: boolean;
  detail?: string;
}

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

const statusCfg = (colors: AppColors): Record<string, { color: string; bg: string; label: string }> => ({
  completed: { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', label: 'Active' },
  pending:   { color: '#FFC107', bg: 'rgba(255,193,7,0.12)',  label: 'Pending' },
  failed:    { color: '#FF5A5A', bg: 'rgba(255,90,90,0.1)',   label: 'Failed' },
  cancelled: { color: colors.textDim, bg: colors.surfaceHover, label: 'Cancelled' },
});

const DEFAULT_FEATURES = ['Full course access', 'Live trading sessions', 'Trading signals', 'Community chat', 'Certificates'];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_CFG = useMemo(() => statusCfg(colors), [colors]);
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const [paymentsRes, perksRes] = await Promise.allSettled([
        apiFetch('api/payments/user'),
        apiFetch('api/package-perks'),
      ]);
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const raw = await paymentsRes.value.json();
        const list: Payment[] = Array.isArray(raw) ? raw : raw.data ?? raw.payments ?? [];
        setPayments(list);
      }
      if (perksRes.status === 'fulfilled' && perksRes.value.ok) {
        const d = await perksRes.value.json();
        const rawPerks = d.perks ?? {};
        const parsed: Perk[] = Object.entries(rawPerks).map(([key, val]) => {
          const v = val as Record<string, unknown>;
          return {
            key,
            description: (v.description as string) ?? key,
            enabled: !!(v.enabled),
            detail: (v.sessionsPerMonth ? `${v.sessionsPerMonth} sessions/mo` : undefined) ??
                    (v.type ? String(v.type) : undefined) ??
                    (v.access ? String(v.access) : undefined),
          };
        });
        setPerks(parsed);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchPayments = fetchAll; // alias for RefreshControl usage

  useEffect(() => { fetchAll(); }, []);

  const packagePayments = payments.filter((p) => !p.type || p.type === 'package');
  const monthlyPayments = payments.filter((p) => p.type === 'monthly_fee');
  const activePackage = packagePayments.find((p) => p.status === 'completed');

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Subscription" subtitle="Plan & billing" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.black} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} /> : (
          <>
            {/* Active package card */}
            {activePackage ? (
              <View style={styles.activeCard}>
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
                  {perks.length > 0
                    ? perks.map((p) => (
                        <View key={p.key} style={styles.featureRow}>
                          <Ionicons
                            name={p.enabled ? 'checkmark' : 'close'}
                            size={14}
                            color={p.enabled ? colors.blue : colors.textDim}
                          />
                          <Text style={[styles.featureText, !p.enabled && styles.featureDisabled]}>
                            {p.description}
                            {p.detail ? <Text style={styles.featureDetail}>  ·  {p.detail}</Text> : null}
                          </Text>
                        </View>
                      ))
                    : DEFAULT_FEATURES.map((f) => (
                        <View key={f} style={styles.featureRow}>
                          <Ionicons name="checkmark" size={14} color={colors.text} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))
                  }
                </View>
                <Pressable style={styles.upgradeBtn} onPress={() => router.push('/subscription-upgrade')}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={colors.primaryForeground} />
                  <Text style={styles.upgradeText}>Upgrade Package</Text>
                </Pressable>
                <Pressable style={styles.monthlyFeeBtn} onPress={() => router.push('/(app)/monthly-fee')}>
                  <Ionicons name="calendar-outline" size={16} color={colors.text} />
                  <Text style={styles.monthlyFeeText}>Pay Monthly Fee</Text>
                </Pressable>
              </View>
            ) : (
              <GlassListCard contentStyle={styles.noSubCard}>
                <Ionicons name="layers-outline" size={44} color={colors.textMuted} />
                <Text style={styles.noSubTitle}>No Active Subscription</Text>
                <Text style={styles.noSubText}>Choose a package to get access to all features.</Text>
                <Pressable style={styles.noSubBtn} onPress={() => router.replace('/select-package')}>
                  <Text style={styles.noSubBtnText}>View Packages</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primaryForeground} />
                </Pressable>
              </GlassListCard>
            )}

            {/* Package payments */}
            {packagePayments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Package History</Text>
                <GlassListCard contentStyle={styles.card}>
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
                </GlassListCard>
              </View>
            )}

            {/* Monthly fees */}
            {monthlyPayments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monthly Fees</Text>
                <GlassListCard contentStyle={styles.card}>
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
                </GlassListCard>
              </View>
            )}

            {/* Support CTA */}
            <GlassListCard contentStyle={styles.supportBtn} onPress={() => router.push('/(app)/support')}>
              <Ionicons name="help-circle-outline" size={18} color={colors.text} />
              <Text style={styles.supportText}>Need help with billing? Contact support</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </GlassListCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  activeCard: {
    borderRadius: 22, padding: 24, gap: 8,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  activeGlow: { position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.surfaceHover },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(52,199,89,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(52,199,89,0.35)' },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.success, letterSpacing: 0.8 },
  activePkgName: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  activeAmount: { fontSize: 36, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  activeDate: { fontSize: 12, color: colors.textMuted },
  featureList: { marginTop: 8, gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { flex: 1, fontSize: 13.5, color: colors.textSilver, fontWeight: '500' },
  featureDisabled: { color: colors.textDim },
  featureDetail: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  noSubCard: { padding: 32, alignItems: 'center', gap: 10 },
  noSubTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  noSubText: { fontSize: 13.5, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
  noSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, height: 48, paddingHorizontal: 22, borderRadius: 14, backgroundColor: colors.primary },
  noSubBtnText: { fontSize: 14, fontWeight: '800', color: colors.primaryForeground },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  card: { paddingHorizontal: 16, paddingVertical: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  payDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  payIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  payInfo: { flex: 1, gap: 2, minWidth: 0 },
  payName: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  payDate: { fontSize: 11, color: colors.textDim },
  payTxId: { fontSize: 10, color: colors.textDim, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  payRight: { alignItems: 'flex-end', gap: 4 },
  payAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  statusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  supportBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  supportText: { flex: 1, fontSize: 13.5, color: colors.textSecondary, fontWeight: '500' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, height: 44, borderRadius: 14, backgroundColor: colors.primary },
  upgradeText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  monthlyFeeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 6, height: 44, borderRadius: 14, backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border },
  monthlyFeeText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
}
