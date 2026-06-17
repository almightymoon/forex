import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiFetch } from '../utils/api';
import { resolveMediaUrl } from '../utils/normalize';

type UnlockStatus = 'unlocked' | 'fulfilled' | 'cancelled';

interface Rule {
  _id: string;
  name: string;
  thresholdBalance: number;
  rewardDescription: string;
  rewardValue?: string;
  imageUrl?: string;
  sortOrder?: number;
}

interface Unlock {
  rule: string;
  status: UnlockStatus;
  unlockedAt?: string;
  fulfilledAt?: string;
}

interface ProgressResponse {
  directBusinessVolumeUsd: number;
  rules: Rule[];
  unlocks: Unlock[];
  currentRule: Rule | null;
  nextRule: Rule | null;
}

function formatMoney(v: number) {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  /** When true, hides the outer section title (use on dedicated screen). */
  embedded?: boolean;
  onRefresh?: () => void;
};

export function RankRewardsProgress({ embedded = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('api/rank-rewards/progress');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        return;
      }
      setData(json as ProgressResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlockByRuleId = useMemo(() => {
    const m = new Map<string, Unlock>();
    (data?.unlocks || []).forEach((u) => {
      if (u?.rule) m.set(String(u.rule), u);
    });
    return m;
  }, [data]);

  const directBusinessVolumeUsd = Number(data?.directBusinessVolumeUsd || 0);
  const rules = Array.isArray(data?.rules) ? data.rules : [];
  const current = data?.currentRule || null;
  const next = data?.nextRule || null;
  const currentThreshold = Number(current?.thresholdBalance || 0);
  const nextThreshold = Number(next?.thresholdBalance || 0);
  const remaining = next ? Math.max(0, nextThreshold - directBusinessVolumeUsd) : 0;

  const progressPct = useMemo(() => {
    if (!next) return 100;
    const span = Math.max(0.000001, nextThreshold - currentThreshold);
    const raw = ((directBusinessVolumeUsd - currentThreshold) / span) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [next, nextThreshold, currentThreshold, directBusinessVolumeUsd]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#3AADFF" />
      </View>
    );
  }

  if (!data || rules.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="trophy-outline" size={36} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyTitle}>No rank rewards configured yet</Text>
        <Text style={styles.emptySub}>Please check back later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!embedded ? <Text style={styles.sectionTitle}>Rank Rewards</Text> : null}

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Business volume (direct referrals)</Text>
        <Text style={styles.summaryValue}>${formatMoney(directBusinessVolumeUsd)} USDT</Text>
        <Text style={styles.currentTier}>
          Current tier:{' '}
          <Text style={styles.currentTierName}>{current ? current.name : 'Not started'}</Text>
        </Text>

        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>NEXT REWARD</Text>
          {next ? (
            <>
              <Text style={styles.nextName}>{next.name}</Text>
              <Text style={styles.nextHint}>
                Get <Text style={styles.nextHighlight}>${formatMoney(remaining)}</Text> more business volume from direct referrals
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.nextName}>All rewards unlocked</Text>
              <Text style={styles.nextHint}>Great work — you reached the top tier.</Text>
            </>
          )}
        </View>

        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>${formatMoney(currentThreshold)}</Text>
          <Text style={styles.progressLabel}>${formatMoney(next ? nextThreshold : currentThreshold)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#0060E6', '#3AADFF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressFill, { width: `${progressPct}%` as `${number}%` }]}
          />
        </View>

        {directBusinessVolumeUsd <= 0 && (
          <View style={styles.tipBox}>
            <Ionicons name="sparkles" size={18} color="#3AADFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Invite friends to unlock your first reward</Text>
              <Text style={styles.tipSub}>
                Your progress updates automatically as your direct referrals buy packages.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Rules list */}
      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Rewards</Text>
            <Text style={styles.listSub}>Track what's unlocked and what's next.</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={load}>
            <Ionicons name="refresh" size={16} color="#3AADFF" />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {rules.map((r) => {
          const unlock = unlockByRuleId.get(String(r._id));
          const thr = Number(r.thresholdBalance || 0);
          const reached = directBusinessVolumeUsd >= thr;
          const isFulfilled = unlock?.status === 'fulfilled';
          const isUnlocked = unlock?.status === 'unlocked' || reached;
          const locked = !isUnlocked;
          const need = Math.max(0, thr - directBusinessVolumeUsd);
          const imageUri = resolveMediaUrl(r.imageUrl);

          return (
            <View
              key={r._id}
              style={[
                styles.ruleCard,
                isFulfilled && styles.ruleFulfilled,
                isUnlocked && !isFulfilled && styles.ruleUnlocked,
              ]}
            >
              <View style={styles.ruleTop}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.ruleImage} />
                ) : (
                  <View style={styles.ruleImagePlaceholder}>
                    <Ionicons name="trophy" size={22} color="rgba(255,255,255,0.45)" />
                  </View>
                )}
                <View style={styles.ruleInfo}>
                  <View style={styles.ruleNameRow}>
                    <Text style={styles.ruleName} numberOfLines={1}>{r.name}</Text>
                    <View style={styles.thresholdBadge}>
                      <Text style={styles.thresholdText}>${formatMoney(thr)}</Text>
                    </View>
                  </View>
                  <Text style={styles.ruleDesc} numberOfLines={2}>{r.rewardDescription}</Text>
                  {r.rewardValue ? (
                    <Text style={styles.ruleValue}>
                      <Text style={styles.ruleValueLabel}>Value: </Text>
                      {r.rewardValue}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.ruleFooter}>
                {isFulfilled ? (
                  <View style={[styles.statusBadge, styles.statusFulfilled]}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.statusText}>Fulfilled</Text>
                  </View>
                ) : locked ? (
                  <View style={[styles.statusBadge, styles.statusLocked]}>
                    <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={[styles.statusText, { color: 'rgba(255,255,255,0.6)' }]}>Locked</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusUnlocked]}>
                    <Ionicons name="trophy" size={14} color="#fff" />
                    <Text style={styles.statusText}>Unlocked</Text>
                  </View>
                )}
                {locked ? (
                  <Text style={styles.needText}>
                    Need <Text style={styles.needAmount}>${formatMoney(need)}</Text> more volume
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  emptyCard: {
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  summaryCard: {
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    gap: 10,
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  summaryValue: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  currentTier: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  currentTierName: { fontWeight: '700', color: '#fff' },
  nextBox: {
    marginTop: 6,
    backgroundColor: 'rgba(0,96,230,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.2)',
    padding: 14,
    gap: 4,
  },
  nextLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.35)', letterSpacing: 1 },
  nextName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  nextHint: { fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  nextHighlight: { fontWeight: '800', color: '#3AADFF' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    backgroundColor: 'rgba(0,96,230,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.25)',
    padding: 12,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#3AADFF' },
  tipSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 17 },
  listCard: {
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  listHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  listTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  listSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.3)',
    backgroundColor: 'rgba(0,96,230,0.1)',
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: '#3AADFF' },
  ruleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    gap: 12,
  },
  ruleFulfilled: {
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  ruleUnlocked: {
    borderColor: 'rgba(58,173,255,0.3)',
    backgroundColor: 'rgba(0,96,230,0.08)',
  },
  ruleTop: { flexDirection: 'row', gap: 12 },
  ruleImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ruleImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleInfo: { flex: 1, gap: 4, minWidth: 0 },
  ruleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ruleName: { fontSize: 14.5, fontWeight: '700', color: '#fff', flexShrink: 1 },
  thresholdBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  thresholdText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  ruleDesc: { fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },
  ruleValue: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  ruleValueLabel: { fontWeight: '700' },
  ruleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusFulfilled: { backgroundColor: '#16A34A' },
  statusUnlocked: { backgroundColor: '#0060E6' },
  statusLocked: { backgroundColor: 'rgba(255,255,255,0.08)' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  needText: { fontSize: 11.5, color: 'rgba(255,255,255,0.4)', flexShrink: 1, textAlign: 'right' },
  needAmount: { fontWeight: '800', color: '#fff' },
});
