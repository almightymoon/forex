import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { RankRewardsProgress } from '../../components/RankRewardsProgress';
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

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReferralsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [code, setCode] = useState('');
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
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
        // rank can be a string, { current, next, progressToNext }, or { name, ... }
        const resolveRank = (r: unknown): string => {
          if (!r) return 'Member';
          if (typeof r === 'string') return r;
          if (typeof r === 'object') {
            const obj = r as Record<string, unknown>;
            // { current: { name, ... }, next, progressToNext }
            if (obj.current) return resolveRank(obj.current);
            // { name, icon, ... }
            if (typeof obj.name === 'string') return obj.name;
          }
          return 'Member';
        };
        raw.rank = resolveRank(raw.rank);
        setStats(raw);
      }
      if (earningsRes.status === 'fulfilled' && earningsRes.value.ok) {
        const d = await earningsRes.value.json();
        const list = d.data?.earnings ?? d.data ?? d.earnings ?? d ?? [];
        setEarnings(Array.isArray(list) ? list.slice(0, 20) : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

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

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Referrals</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <ActivityIndicator color="#3AADFF" style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Referrals</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card — code + share */}
        <LinearGradient
          colors={['rgba(0,96,230,0.3)', 'rgba(255,255,255,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <Ionicons name="people" size={36} color="#3AADFF" style={{ opacity: 0.9 }} />
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
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </Pressable>
            <Pressable style={styles.copyBtn} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={15} color="#3AADFF" />
              <Text style={styles.copyBtnText}>Copy Link</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Stats grid */}
        {stats ? (
          <>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatBox icon="people-outline" label="Total Referrals" value={String(stats.totalReferrals ?? 0)} color="#3AADFF" />
                <StatBox icon="checkmark-circle-outline" label="Verified" value={String(stats.verifiedReferrals ?? 0)} color="#4ADE80" />
              </View>
              <View style={styles.statsRow}>
                <StatBox icon="wallet-outline" label="Total Earned" value={`$${Number(stats.totalEarnings ?? 0).toFixed(2)}`} color="#FFC107" />
                <StatBox icon="ribbon-outline" label="Rank" value={stats.rank ?? 'Member'} color="#E879F9" />
              </View>
            </View>

            {/* Level breakdown */}
            {stats.levelCounts && Object.values(stats.levelCounts).some((v) => v > 0) ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Referral Network Levels</Text>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const count = stats.levelCounts?.[String(lvl)] ?? 0;
                  const pct = stats.totalReferrals > 0 ? (count / stats.totalReferrals) * 100 : 0;
                  return (
                    <View key={lvl} style={styles.levelRow}>
                      <Text style={styles.levelLabel}>Level {lvl}</Text>
                      <View style={styles.levelBar}>
                        <View style={[styles.levelFill, { width: `${pct}%` as `${number}%` }]} />
                      </View>
                      <Text style={styles.levelCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <RankRewardsProgress />
          </>
        ) : null}

        {/* Earnings history */}
        {earnings.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Earnings History</Text>
            <View style={styles.card}>
              {earnings.map((e, idx) => {
                const name = e.referredUser
                  ? `${e.referredUser.firstName ?? ''} ${e.referredUser.lastName ?? ''}`.trim()
                  : e.description ?? 'Commission';
                const statusColor = e.status === 'completed' ? '#4ADE80' : e.status === 'pending' ? '#FFC107' : 'rgba(255,255,255,0.3)';
                return (
                  <View key={e._id ?? idx} style={[styles.earningRow, idx < earnings.length - 1 && styles.earningDivider]}>
                    <View style={styles.earningIcon}>
                      <Ionicons name="cash-outline" size={16} color="#FFC107" />
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
            </View>
          </>
        ) : (
          <View style={styles.noEarnings}>
            <Ionicons name="cash-outline" size={44} color="rgba(255,255,255,0.1)" />
            <Text style={styles.noEarningsText}>No earnings yet</Text>
            <Text style={styles.noEarningsSub}>Share your referral link to start earning!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={[statStyles.box, { borderColor: `${color}25` }]}>
      <View style={statStyles.topRow}>
        <Text style={statStyles.label}>{label}</Text>
        <View style={[statStyles.icon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
      </View>
      <Text style={[statStyles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1, padding: 16, gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  heroCard: {
    borderRadius: 22, padding: 24, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.18)', overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(58,173,255,0.1)',
  },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  codeBox: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.3)',
    width: '100%',
  },
  codeLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase' },
  codeValue: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  shareRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, borderRadius: 13, backgroundColor: 'rgba(0,96,230,0.35)',
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.4)',
  },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, paddingHorizontal: 18, borderRadius: 13,
    borderWidth: 1, borderColor: 'rgba(58,173,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#3AADFF' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statsGrid: { gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
    padding: 16, gap: 12,
  },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', width: 50, fontWeight: '600' },
  levelBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  levelFill: { height: '100%', backgroundColor: '#3AADFF', borderRadius: 3 },
  levelCount: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  earningDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  earningIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,193,7,0.15)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  earningInfo: { flex: 1, gap: 2, minWidth: 0 },
  earningName: { fontSize: 13.5, fontWeight: '600', color: '#fff' },
  earningDate: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  earningRight: { alignItems: 'flex-end', gap: 2 },
  earningAmount: { fontSize: 15, fontWeight: '800', color: '#4ADE80' },
  earningStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  noEarnings: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  noEarningsText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  noEarningsSub: { fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
});
