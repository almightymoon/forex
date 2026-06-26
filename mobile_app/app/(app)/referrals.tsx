import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { MenuStackHeader, getNeoChipActive } from '../../components/navigation/MenuStackHeader';
import { RankRewardsProgress } from '../../components/RankRewardsProgress';
import { ScreenError } from '../../components/ScreenError';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';

interface ReferralStats {
  totalReferrals: number;
  directReferrals: number;
  verifiedReferrals: number;
  unverifiedReferrals: number;
  totalEarnings?: number;
  rank?: string;
  levelCounts?: Record<string, number>;
}

interface EarningItem {
  _id?: string;
  amount?: number;
  currency?: string;
  type?: string;
  status?: string;
  description?: string;
  createdAt?: string;
  referredUser?: { firstName?: string; lastName?: string };
}

interface NetworkMember {
  _id?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  level?: number;
  isVerified?: boolean;
  status?: string;
  joinedAt?: string;
  createdAt?: string;
}

const LEVEL_BAR_OPACITY = [1, 0.75, 0.55, 0.4, 0.3];

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type NetworkTab = 'overview' | 'network';

export default function ReferralsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);
  const router = useRouter();
  const [tab, setTab] = useState<NetworkTab>('overview');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [code, setCode] = useState('');
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [network, setNetwork] = useState<NetworkMember[]>([]);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [loading, setLoading] = useState(true);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveRank = (r: unknown): string => {
    if (!r) return 'Member';
    if (typeof r === 'string') return r;
    if (typeof r === 'object') {
      const obj = r as Record<string, unknown>;
      if (obj.current) return resolveRank(obj.current);
      if (typeof obj.name === 'string') return obj.name;
    }
    return 'Member';
  };

  const fetchAll = async () => {
    setError(null);
    try {
      const [codeRes, statsRes, earningsRes] = await Promise.allSettled([
        apiFetch('api/referrals/code'),
        apiFetch('api/referrals/stats'),
        apiFetch('api/referrals/earnings'),
      ]);

      if (codeRes.status === 'fulfilled' && codeRes.value.ok) {
        const d = await codeRes.value.json();
        setCode(d.referralCode ?? '');
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        const raw = d.data ?? d;
        raw.rank = resolveRank(raw.rank);
        setStats(raw);
      } else if (statsRes.status === 'rejected') {
        setError('No connection. Pull down to retry.');
      }
      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const d = await earningsRes.value.json();
        const list = d.data?.earnings ?? d.data ?? d.earnings ?? d ?? [];
        setEarnings(Array.isArray(list) ? list.slice(0, 20) : []);
      }
    } catch {
      setError('No connection. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNetwork = async (filter: 'all' | 'verified' | 'unverified' = networkFilter) => {
    setNetworkLoading(true);
    try {
      const res = await apiFetch(`api/referrals/list?filter=${filter}`);
      if (res.ok) {
        const d = await res.json();
        const list: NetworkMember[] = d.data?.list ?? d.list ?? [];
        setNetwork(list);
      }
    } catch { /* show empty */ } finally {
      setNetworkLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (tab === 'network' && network.length === 0) fetchNetwork();
  }, [tab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
    if (tab === 'network') fetchNetwork();
  };

  const switchNetworkFilter = (f: 'all' | 'verified' | 'unverified') => {
    setNetworkFilter(f);
    fetchNetwork(f);
  };

  const referralUrl = `https://thefxnavigators.com/register?ref=${code}`;

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Join The FX Navigators — the #1 forex education platform!\nUse my referral code: ${code}\nSign up here: ${referralUrl}`,
        url: referralUrl,
        title: 'Join FX Navigators',
      });
    } catch { /* ignore */ }
  };

  const handleCopyLink = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(referralUrl);
    toast('Referral link copied!');
  };

  const tabSwitcher = (
    <View style={styles.tabRow}>
      <Pressable
        style={[styles.tabBtn, tab === 'overview' && styles.tabBtnActive]}
        onPress={() => setTab('overview')}
      >
        <Text style={[styles.tabBtnText, tab === 'overview' && styles.tabBtnTextActive]}>Overview</Text>
      </Pressable>
      <Pressable
        style={[styles.tabBtn, tab === 'network' && styles.tabBtnActive]}
        onPress={() => setTab('network')}
      >
        <Text style={[styles.tabBtnText, tab === 'network' && styles.tabBtnTextActive]}>
          My Network {stats?.totalReferrals ? `(${stats.totalReferrals})` : ''}
        </Text>
      </Pressable>
    </View>
  );

  const screenHeader = (
    <>
      <MenuStackHeader title="Referrals" subtitle="Invite & earn commissions" onBack={() => router.back()} />
      {tabSwitcher}
    </>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        {screenHeader}
        <ActivityIndicator color={colors.black} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        {screenHeader}
        <ScreenError message={error} onRetry={() => { setLoading(true); fetchAll(); }} />
      </View>
    );
  }

  /* ── Network tab ─────────────────────────────────────────── */
  if (tab === 'network') {
    const levelGroups: Record<number, NetworkMember[]> = {};
    for (const m of network) {
      const lvl = m.level ?? 1;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(m);
    }

    return (
      <View style={styles.screen}>
        {screenHeader}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Filter chips */}
          <View style={styles.networkFilters}>
            {(['all', 'verified', 'unverified'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.nfChip, networkFilter === f && styles.nfChipActive]}
                onPress={() => switchNetworkFilter(f)}
              >
                <Text style={[styles.nfChipText, networkFilter === f && styles.nfChipTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {networkLoading ? (
            <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} />
          ) : network.length === 0 ? (
            <View style={styles.noEarnings}>
              <Ionicons name="people-outline" size={44} color={colors.textMuted} />
              <Text style={styles.noEarningsText}>No referrals yet</Text>
              <Text style={styles.noEarningsSub}>Share your code to grow your network.</Text>
            </View>
          ) : (
            Object.entries(levelGroups)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([lvl, members]) => (
                  <View key={lvl}>
                    <View style={styles.levelHeading}>
                      <View style={styles.levelDot} />
                      <Text style={styles.levelHeadingText}>
                        Level {lvl}
                      </Text>
                      <Text style={styles.levelHeadingCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <GlassListCard contentStyle={styles.card}>
                      {members.map((m, idx) => {
                        const fname = m.user?.firstName ?? m.firstName ?? '';
                        const lname = m.user?.lastName ?? m.lastName ?? '';
                        const name = `${fname} ${lname}`.trim() || (m.user?.email ?? m.email ?? 'Unknown');
                        const initials = ((fname[0] ?? '') + (lname[0] ?? '')).toUpperCase() || '?';
                        const verified = m.isVerified ?? m.status === 'verified';
                        const joined = m.joinedAt ?? m.createdAt;
                        return (
                          <View
                            key={m._id ?? idx}
                            style={[styles.memberRow, idx < members.length - 1 && styles.memberDivider]}
                          >
                            <View style={styles.memberAvatar}>
                              <Text style={styles.memberInitials}>{initials}</Text>
                            </View>
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                              {joined ? (
                                <Text style={styles.memberDate}>Joined {formatDate(joined)}</Text>
                              ) : null}
                            </View>
                            <View style={[styles.memberBadge, verified ? styles.memberBadgeVerified : styles.memberBadgePending]}>
                              <Ionicons
                                name={verified ? 'checkmark-circle' : 'time-outline'}
                                size={11}
                                color={verified ? colors.text : colors.textMuted}
                              />
                              <Text style={[styles.memberBadgeText, verified ? styles.memberBadgeTextVerified : styles.memberBadgeTextPending]}>
                                {verified ? 'Verified' : 'Pending'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </GlassListCard>
                  </View>
                ))
          )}
        </ScrollView>
      </View>
    );
  }

  /* ── Overview tab ────────────────────────────────────────── */
  return (
    <View style={styles.screen}>
      {screenHeader}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card — code + share */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Ionicons name="people" size={36} color={colors.text} style={{ opacity: 0.9 }} />
          <Text style={styles.heroTitle}>Invite & Earn</Text>
          <Text style={styles.heroSub}>
            Invite friends to join The FX Navigators and earn commissions on their subscriptions.
          </Text>

          {code ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
          ) : null}

          <View style={styles.shareRow}>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color={colors.primaryForeground} />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </Pressable>
            <Pressable style={styles.copyBtn} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={15} color={colors.text} />
              <Text style={styles.copyBtnText}>Copy Link</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats grid */}
        {stats ? (
          <>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatBox icon="people-outline" label="Total Referrals" value={String(stats.totalReferrals ?? 0)} />
                <StatBox icon="checkmark-circle-outline" label="Verified" value={String(stats.verifiedReferrals ?? 0)} />
              </View>
              <View style={styles.statsRow}>
                <StatBox icon="wallet-outline" label="Total Earned" value={`$${Number(stats.totalEarnings ?? 0).toFixed(2)}`} />
                <StatBox icon="ribbon-outline" label="Rank" value={stats.rank ?? 'Member'} />
              </View>
            </View>

            {/* Level breakdown */}
            {stats.levelCounts && Object.values(stats.levelCounts).some((v) => v > 0) ? (
              <GlassListCard contentStyle={styles.card}>
                <Text style={styles.cardTitle}>Referral Network Levels</Text>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const count = stats.levelCounts?.[String(lvl)] ?? 0;
                  const barOpacity = LEVEL_BAR_OPACITY[lvl - 1];
                  const pct = stats.totalReferrals > 0 ? (count / stats.totalReferrals) * 100 : 0;
                  return (
                    <View key={lvl} style={styles.levelRow}>
                      <Text style={styles.levelLabel}>Level {lvl}</Text>
                      <View style={styles.levelBar}>
                        <View style={[styles.levelFill, { width: `${pct}%` as `${number}%`, opacity: barOpacity }]} />
                      </View>
                      <Text style={styles.levelCount}>{count}</Text>
                    </View>
                  );
                })}
                <Pressable style={styles.viewTreeBtn} onPress={() => setTab('network')}>
                  <Ionicons name="people-outline" size={14} color={colors.text} />
                  <Text style={styles.viewTreeBtnText}>View My Network</Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.text} />
                </Pressable>
              </GlassListCard>
            ) : null}

            <RankRewardsProgress />
          </>
        ) : null}

        {/* Earnings history */}
        {earnings.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Earnings History</Text>
            <GlassListCard contentStyle={styles.card}>
              {earnings.map((e, idx) => {
                const name = e.referredUser
                  ? `${e.referredUser.firstName ?? ''} ${e.referredUser.lastName ?? ''}`.trim()
                  : e.description ?? 'Commission';
                const statusColor = e.status === 'completed' ? colors.text : colors.textMuted;
                return (
                  <View key={e._id ?? idx} style={[styles.earningRow, idx < earnings.length - 1 && styles.earningDivider]}>
                    <View style={styles.earningIcon}>
                      <Ionicons name="cash-outline" size={16} color={colors.text} />
                    </View>
                    <View style={styles.earningInfo}>
                      <Text style={styles.earningName} numberOfLines={1}>{name}</Text>
                      {e.createdAt ? <Text style={styles.earningDate}>{formatDate(e.createdAt)}</Text> : null}
                    </View>
                    <View style={styles.earningRight}>
                      <Text style={styles.earningAmount}>+${(e.amount ?? 0).toFixed(2)}</Text>
                      {e.status ? (
                        <Text style={[styles.earningStatus, { color: statusColor }]}>
                          {e.status}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </GlassListCard>
          </>
        ) : (
          <View style={styles.noEarnings}>
            <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
            <Text style={styles.noEarningsText}>No earnings yet</Text>
            <Text style={styles.noEarningsSub}>Share your referral link to start earning!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);

  return (
    <View style={statStyles.box}>
      <View style={statStyles.topRow}>
        <Text style={statStyles.label}>{label}</Text>
        <View style={statStyles.icon}>
          <Ionicons name={icon} size={17} color={colors.text} />
        </View>
      </View>
      <Text style={statStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
    </View>
  );
}

function createStatStyles(colors: AppColors) {
  return StyleSheet.create({
  box: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  heroCard: {
    borderRadius: 22, padding: 24, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  heroGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.surfaceHover,
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  codeBox: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
    width: '100%',
  },
  codeLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' },
  codeValue: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: 4 },
  shareRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 48, borderRadius: 14, backgroundColor: colors.primary,
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: colors.primaryForeground },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 48, paddingHorizontal: 18, borderRadius: 14,
    borderWidth: 1, borderColor: colors.primary,
    backgroundColor: colors.surfaceHover,
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  statsGrid: { gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  card: { padding: 16, gap: 12 },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelLabel: { fontSize: 12, color: colors.textSecondary, width: 50, fontWeight: '600' },
  levelBar: { flex: 1, height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  levelFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  levelCount: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  earningDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  earningIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  earningInfo: { flex: 1, gap: 2, minWidth: 0 },
  earningName: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  earningDate: { fontSize: 11, color: colors.textDim },
  earningRight: { alignItems: 'flex-end', gap: 2 },
  earningAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  earningStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  noEarnings: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  noEarningsText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  noEarningsSub: { fontSize: 13, color: colors.textDim, textAlign: 'center' },

  // tab switcher
  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  tabBtnActive: { ...getNeoChipActive(colors) },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabBtnTextActive: { color: colors.text, fontWeight: '800' },

  // network filter chips
  networkFilters: { flexDirection: 'row', gap: 8 },
  nfChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1, borderColor: colors.border,
  },
  nfChipActive: { ...getNeoChipActive(colors) },
  nfChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  nfChipTextActive: { color: colors.text, fontWeight: '700' },

  // level group headings
  levelHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  levelHeadingText: { fontSize: 13, fontWeight: '800', flex: 1, color: colors.text },
  levelHeadingCount: { fontSize: 12, color: colors.textDim, fontWeight: '600' },

  // member rows
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  memberDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    flexShrink: 0,
  },
  memberInitials: { fontSize: 13, fontWeight: '800', color: colors.text },
  memberInfo: { flex: 1, gap: 2, minWidth: 0 },
  memberName: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  memberDate: { fontSize: 11, color: colors.textDim },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  memberBadgeVerified: { backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border },
  memberBadgePending: { backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border },
  memberBadgeText: { fontSize: 10, fontWeight: '700' },
  memberBadgeTextVerified: { color: colors.text },
  memberBadgeTextPending: { color: colors.textMuted },

  // view tree button
  viewTreeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 4, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  viewTreeBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
});
}
