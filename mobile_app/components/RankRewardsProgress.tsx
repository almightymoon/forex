import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { GlassCard } from '../components/GlassCard';
import { GlassListCard } from '../components/glass/GlassListCard';
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
  thresholdBalance?: number;
  balanceAtUnlock?: number;
  fulfillmentNotes?: string;
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

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRuleProgress(ruleIndex: number, volume: number, rules: Rule[]) {
  const thr = Number(rules[ruleIndex]?.thresholdBalance || 0);
  const prevThr = ruleIndex > 0 ? Number(rules[ruleIndex - 1]?.thresholdBalance || 0) : 0;
  if (volume >= thr) return 100;
  const span = Math.max(0.000001, thr - prevThr);
  return Math.max(0, Math.min(100, ((volume - prevThr) / span) * 100));
}

type Props = {
  /** When true, hides the outer section title (use on dedicated screen). */
  embedded?: boolean;
  onRefresh?: () => void;
};

export function RankRewardsProgress({ embedded = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const detailStyles = useMemo(() => createDetailStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

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

  const selectedRule = useMemo(
    () => rules.find((r) => String(r._id) === selectedRuleId) ?? null,
    [rules, selectedRuleId],
  );
  const selectedIndex = useMemo(
    () => rules.findIndex((r) => String(r._id) === selectedRuleId),
    [rules, selectedRuleId],
  );
  const selectedUnlock = selectedRule ? unlockByRuleId.get(String(selectedRule._id)) : undefined;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data || rules.length === 0) {
    return (
      <GlassListCard contentStyle={styles.emptyCard}>
        <Ionicons name="trophy-outline" size={36} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No rank rewards configured yet</Text>
        <Text style={styles.emptySub}>Please check back later.</Text>
      </GlassListCard>
    );
  }

  return (
    <View style={styles.wrap}>
      {!embedded ? <Text style={styles.sectionTitle}>Rank Rewards</Text> : null}

      {/* Summary */}
      <GlassCard prominent contentStyle={styles.summaryCard}>
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
            colors={[colors.black, colors.textSecondary]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressFill, { width: `${progressPct}%` as `${number}%` }]}
          />
        </View>

        {directBusinessVolumeUsd <= 0 && (
          <View style={styles.tipBox}>
            <Ionicons name="sparkles" size={18} color={colors.black} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Invite friends to unlock your first reward</Text>
              <Text style={styles.tipSub}>
                Your progress updates automatically as your direct referrals buy packages.
              </Text>
            </View>
          </View>
        )}
      </GlassCard>

      {/* Rules list */}
      <GlassListCard contentStyle={styles.listCard}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Rewards</Text>
            <Text style={styles.listSub}>Track what's unlocked and what's next.</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={load}>
            <Ionicons name="refresh" size={16} color={colors.text} />
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
            <Pressable
              key={r._id}
              onPress={() => setSelectedRuleId(String(r._id))}
              style={({ pressed }) => [pressed && styles.rulePressed]}
            >
              <GlassCard
                contentStyle={[
                  styles.ruleCard,
                  isFulfilled && styles.ruleFulfilled,
                  isUnlocked && !isFulfilled && styles.ruleUnlocked,
                ]}
                radius={14}
              >
                <View style={styles.ruleTop}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.ruleImage} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={styles.ruleImagePlaceholder}>
                      <Ionicons name="trophy" size={22} color={colors.textMuted} />
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
                  <Ionicons name="chevron-forward" size={18} color={colors.textDim} style={styles.ruleChevron} />
                </View>

                <View style={styles.ruleFooter}>
                  {isFulfilled ? (
                    <View style={[styles.statusBadge, styles.statusFulfilled]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primaryForeground} />
                      <Text style={styles.statusTextOnDark}>Fulfilled</Text>
                    </View>
                  ) : locked ? (
                    <View style={[styles.statusBadge, styles.statusLocked]}>
                      <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                      <Text style={styles.statusTextMuted}>Locked</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.statusUnlocked]}>
                      <Ionicons name="trophy" size={14} color={colors.primaryForeground} />
                      <Text style={styles.statusTextOnDark}>Unlocked</Text>
                    </View>
                  )}
                  {locked ? (
                    <Text style={styles.needText}>
                      Need <Text style={styles.needAmount}>${formatMoney(need)}</Text> more volume
                    </Text>
                  ) : (
                    <Text style={styles.tapHint}>Tap for details</Text>
                  )}
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </GlassListCard>

      <RewardDetailModal
        visible={!!selectedRule}
        rule={selectedRule}
        ruleIndex={selectedIndex}
        unlock={selectedUnlock}
        volume={directBusinessVolumeUsd}
        rules={rules}
        styles={detailStyles}
        colors={colors}
        onClose={() => setSelectedRuleId(null)}
      />
    </View>
  );
}

type DetailModalProps = {
  visible: boolean;
  rule: Rule | null;
  ruleIndex: number;
  unlock?: Unlock;
  volume: number;
  rules: Rule[];
  styles: ReturnType<typeof createDetailStyles>;
  colors: AppColors;
  onClose: () => void;
};

function RewardDetailModal({
  visible,
  rule,
  ruleIndex,
  unlock,
  volume,
  rules,
  styles,
  colors,
  onClose,
}: DetailModalProps) {
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const imageUri = rule ? resolveMediaUrl(rule.imageUrl) : undefined;

  useEffect(() => {
    setImageAspectRatio(1);
  }, [rule?._id, imageUri]);

  const thr = Number(rule?.thresholdBalance || 0);
  const reached = volume >= thr;
  const isFulfilled = unlock?.status === 'fulfilled';
  const isUnlocked = unlock?.status === 'unlocked' || reached;
  const locked = !isUnlocked;
  const need = Math.max(0, thr - volume);
  const tierProgress = rule
    ? getRuleProgress(ruleIndex >= 0 ? ruleIndex : 0, volume, rules)
    : 0;
  const prevThr = ruleIndex > 0 ? Number(rules[ruleIndex - 1]?.thresholdBalance || 0) : 0;

  return (
    <Modal
      visible={visible && !!rule}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {rule ? (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Rank reward</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{rule.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={[styles.heroImage, { aspectRatio: imageAspectRatio }]}
                contentFit="contain"
                cachePolicy="memory-disk"
                onLoad={(e) => {
                  const w = e.source.width;
                  const h = e.source.height;
                  if (w > 0 && h > 0) setImageAspectRatio(w / h);
                }}
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="trophy" size={48} color={colors.primary} />
              </View>
            )}
            <View style={styles.heroBadgeWrap}>
              {isFulfilled ? (
                <View style={[styles.heroBadge, styles.heroBadgeFulfilled]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primaryForeground} />
                  <Text style={styles.heroBadgeText}>Fulfilled</Text>
                </View>
              ) : locked ? (
                <View style={[styles.heroBadge, styles.heroBadgeLocked]}>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  <Text style={[styles.heroBadgeText, styles.heroBadgeTextMuted]}>Locked</Text>
                </View>
              ) : (
                <View style={[styles.heroBadge, styles.heroBadgeUnlocked]}>
                  <Ionicons name="trophy" size={16} color={colors.primaryForeground} />
                  <Text style={styles.heroBadgeText}>Unlocked</Text>
                </View>
              )}
            </View>
          </View>

          <GlassCard contentStyle={styles.detailCard} radius={18}>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Required volume</Text>
                <Text style={styles.statValue}>${formatMoney(thr)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Your volume</Text>
                <Text style={styles.statValue}>${formatMoney(volume)}</Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progress to this tier</Text>
                <Text style={styles.progressPct}>{Math.round(tierProgress)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${tierProgress}%` as `${number}%` }]} />
              </View>
              <Text style={styles.progressHint}>
                ${formatMoney(prevThr)} → ${formatMoney(thr)} direct referral volume
              </Text>
            </View>

            {locked ? (
              <View style={styles.callout}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
                <Text style={styles.calloutText}>
                  You need <Text style={styles.calloutStrong}>${formatMoney(need)}</Text> more direct referral business volume to unlock this reward.
                </Text>
              </View>
            ) : null}
          </GlassCard>

          <GlassCard contentStyle={styles.detailCard} radius={18}>
            <Text style={styles.sectionLabel}>Reward details</Text>
            <Text style={styles.description}>{rule.rewardDescription}</Text>
            {rule.rewardValue ? (
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Estimated value</Text>
                <Text style={styles.valueText}>{rule.rewardValue}</Text>
              </View>
            ) : null}
          </GlassCard>

          {!locked ? (
            <GlassCard contentStyle={styles.detailCard} radius={18}>
              <Text style={styles.sectionLabel}>Unlock status</Text>
              {unlock?.unlockedAt ? (
                <DetailRow icon="calendar-outline" label="Unlocked on" value={formatDate(unlock.unlockedAt) ?? '—'} />
              ) : null}
              {typeof unlock?.balanceAtUnlock === 'number' ? (
                <DetailRow
                  icon="wallet-outline"
                  label="Volume at unlock"
                  value={`$${formatMoney(unlock.balanceAtUnlock)}`}
                />
              ) : null}
              {isFulfilled && unlock?.fulfilledAt ? (
                <DetailRow icon="checkmark-done-outline" label="Fulfilled on" value={formatDate(unlock.fulfilledAt) ?? '—'} />
              ) : null}
              {isFulfilled && unlock?.fulfillmentNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Fulfillment notes</Text>
                  <Text style={styles.notesText}>{unlock.fulfillmentNotes}</Text>
                </View>
              ) : null}
              {!isFulfilled && isUnlocked ? (
                <Text style={styles.pendingText}>
                  This reward is unlocked. Our team will process fulfillment according to program rules.
                </Text>
              ) : null}
            </GlassCard>
          ) : null}
        </ScrollView>
      </View>
      ) : null}
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createDetailStyles(colors), [colors]);

  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { gap: 12 },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  emptyCard: { padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
  emptySub: { fontSize: 13, color: colors.textDim, textAlign: 'center' },
  summaryCard: { padding: 18, gap: 10 },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  summaryValue: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  currentTier: { fontSize: 13, color: colors.textSecondary },
  currentTierName: { fontWeight: '700', color: colors.text },
  nextBox: {
    marginTop: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  nextLabel: { fontSize: 10, fontWeight: '800', color: colors.textDim, letterSpacing: 1 },
  nextName: { fontSize: 15, fontWeight: '700', color: colors.text },
  nextHint: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  nextHighlight: { fontWeight: '800', color: colors.text },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 11, color: colors.textDim },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tipSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  listCard: { padding: 16, gap: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  listTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  listSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
  },
  refreshText: { fontSize: 12, fontWeight: '700', color: colors.text },
  rulePressed: { opacity: 0.92 },
  ruleCard: { padding: 14, gap: 12 },
  ruleFulfilled: {},
  ruleUnlocked: {},
  ruleTop: { flexDirection: 'row', gap: 12 },
  ruleImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ruleImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleInfo: { flex: 1, gap: 4, minWidth: 0 },
  ruleChevron: { alignSelf: 'center' },
  ruleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ruleName: { fontSize: 14.5, fontWeight: '700', color: colors.text, flexShrink: 1 },
  thresholdBadge: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  thresholdText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  ruleDesc: { fontSize: 12.5, color: colors.textMuted, lineHeight: 17 },
  ruleValue: { fontSize: 12, color: colors.textSecondary },
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
  statusFulfilled: { backgroundColor: colors.primary },
  statusUnlocked: { backgroundColor: colors.primary },
  statusLocked: { backgroundColor: colors.surfaceHover },
  statusTextOnDark: { fontSize: 12, fontWeight: '700', color: colors.primaryForeground },
  statusTextMuted: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  needText: { fontSize: 11.5, color: colors.textMuted, flexShrink: 1, textAlign: 'right' },
  needAmount: { fontWeight: '800', color: colors.text },
  tapHint: { fontSize: 11.5, color: colors.textDim, fontWeight: '600' },
});
}

function createDetailStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    headerEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textDim,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { padding: 18, paddingBottom: 40, gap: 14 },
    hero: {
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.surfaceInset,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroImage: {
      width: '100%',
      backgroundColor: colors.surfaceHover,
    },
    heroPlaceholder: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHover,
    },
    heroBadgeWrap: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    heroBadgeFulfilled: { backgroundColor: colors.primary },
    heroBadgeUnlocked: { backgroundColor: colors.primary },
    heroBadgeLocked: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    heroBadgeText: { fontSize: 13, fontWeight: '800', color: colors.primaryForeground },
    heroBadgeTextMuted: { color: colors.textSecondary },
    detailCard: { padding: 16, gap: 12 },
    statRow: { flexDirection: 'row', alignItems: 'center' },
    stat: { flex: 1, gap: 4 },
    statDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 12 },
    statLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    statValue: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
    progressBlock: { gap: 8 },
    progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    progressPct: { fontSize: 13, fontWeight: '800', color: colors.primary },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceInset,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
    progressHint: { fontSize: 12, color: colors.textMuted },
    callout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calloutText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    calloutStrong: { fontWeight: '800', color: colors.text },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textDim,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    description: { fontSize: 15, color: colors.text, lineHeight: 22 },
    valueRow: {
      paddingTop: 4,
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    valueLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    valueText: { fontSize: 16, fontWeight: '800', color: colors.text },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    detailRowCopy: { flex: 1, gap: 2 },
    detailRowLabel: { fontSize: 12, color: colors.textMuted },
    detailRowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    notesBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    notesLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    notesText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    pendingText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  });
}
