import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenError } from '../../components/ScreenError';
import { SignalCard } from '../../components/SignalCard';
import { GlassEmptyState } from '../../components/glass/GlassPressable';
import { apiFetch } from '../../utils/api';
import { normalizeList, normalizeSignal } from '../../utils/normalize';

interface Signal {
  _id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  status: 'active' | 'closed' | 'pending';
  pips?: string;
  createdAt?: string;
  description?: string;
  timeframe?: string;
  riskRewardRatio?: number;
  confidence?: number;
  invalidationLevel?: string;
  notes?: string;
}

type FilterStatus = 'all' | 'active' | 'closed';

const FILTER_OPTIONS: Array<{ key: FilterStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
];

export default function SignalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const detail = useMemo(() => createDetailStyles(colors), [colors]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Signal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSignals = async () => {
    setError(null);
    try {
      const res = await apiFetch('api/signals');
      if (res.ok) {
        const raw = await res.json();
        setSignals(normalizeList<Record<string, unknown>>(raw).map(normalizeSignal));
      } else {
        setError('Unable to load signals. Pull down to retry.');
      }
    } catch {
      setError('No connection. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSignals(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSignals(); };

  const openDetail = async (base: Signal) => {
    setSelected(base);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`api/signals/${base._id}`);
      if (res.ok) {
        const d = await res.json();
        const full = d.signal ?? d;
        setSelected((prev) => prev ? { ...prev, ...normalizeSignal(full as Record<string, unknown>) } : prev);
      }
    } catch { /* show base data */ }
    finally { setDetailLoading(false); }
  };

  const displayed = filter === 'all' ? signals : signals.filter((s) => s.status === filter);
  const activeCount = signals.filter((s) => s.status === 'active').length;
  const totalCount = signals.length;

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Trading Signals</Text>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {activeCount > 0 ? `${activeCount} active` : `${totalCount} total`}
              </Text>
            </View>
          )}
        </View>
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTER_OPTIONS.map((f) => (
            <View
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, filter === f.key && styles.chipTextActive]}
                onPress={() => setFilter(f.key)}
              >
                {f.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} />
        ) : error ? (
          <ScreenError message={error} onRetry={fetchSignals} />
        ) : displayed.length === 0 ? (
          <GlassEmptyState
            title={filter === 'active' ? 'No active signals' : filter === 'closed' ? 'No closed signals' : 'No signals yet'}
            message={
              filter !== 'all'
                ? `Switch to "All" to see all signals.`
                : 'New signals will appear here once published by your instructor.'
            }
          />
        ) : (
          <View style={styles.list}>
            {displayed.map((s) => (
              <SignalCard
                key={s._id}
                variant="list"
                pair={s.pair}
                direction={s.direction}
                entry={s.entryPrice}
                stopLoss={s.stopLoss}
                takeProfit={s.takeProfit}
                status={s.status}
                pips={s.pips}
                createdAt={s.createdAt}
                remark={s.description}
                onPress={() => openDetail(s)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Signal detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <View style={detail.screen}>
          <SafeAreaView edges={['top']} style={detail.headerSafe}>
            <View style={detail.header}>
              <View style={detail.headerText}>
                <Text style={detail.headerEyebrow}>Signal</Text>
                <Text style={detail.headerTitle}>Trade setup</Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={12} style={detail.closeBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
          </SafeAreaView>

          {selected ? (
            <ScrollView contentContainerStyle={detail.content} showsVerticalScrollIndicator={false}>
              <SignalCard
                variant="featured"
                pair={selected.pair}
                direction={selected.direction}
                entry={selected.entryPrice}
                stopLoss={selected.stopLoss}
                takeProfit={selected.takeProfit}
                status={selected.status}
                pips={selected.pips}
                createdAt={selected.createdAt}
                remark={selected.description}
              />

              {detailLoading ? (
                <ActivityIndicator color={colors.black} style={detail.loader} />
              ) : null}

              {(selected.riskRewardRatio || selected.confidence || selected.timeframe || selected.invalidationLevel) ? (
                <View style={detail.insightsCard}>
                  <Text style={detail.sectionLabel}>Insights</Text>
                  <View style={detail.insightsGrid}>
                    {selected.timeframe ? (
                      <InsightChip icon="time-outline" label="Timeframe" value={selected.timeframe} />
                    ) : null}
                    {selected.riskRewardRatio ? (
                      <InsightChip icon="analytics-outline" label="R:R" value={`1 : ${selected.riskRewardRatio.toFixed(2)}`} />
                    ) : null}
                    {selected.confidence ? (
                      <InsightChip icon="speedometer-outline" label="Confidence" value={`${selected.confidence}%`} />
                    ) : null}
                    {selected.invalidationLevel ? (
                      <InsightChip icon="alert-circle-outline" label="Invalidation" value={selected.invalidationLevel} />
                    ) : null}
                  </View>
                </View>
              ) : null}

              {selected.description ? (
                <View style={detail.analysisCard}>
                  <Text style={detail.sectionLabel}>Remarks</Text>
                  <Text style={detail.analysisText}>{selected.description}</Text>
                </View>
              ) : null}

              {selected.notes ? (
                <View style={detail.analysisCard}>
                  <Text style={detail.sectionLabel}>Notes</Text>
                  <Text style={detail.analysisText}>{selected.notes}</Text>
                </View>
              ) : null}

              {selected.createdAt ? (
                <Text style={detail.timestamp}>
                  Published{' '}
                  {new Date(selected.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function InsightChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const detail = useMemo(() => createDetailStyles(colors), [colors]);

  return (
    <View style={detail.insightChip}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={detail.insightLabel}>{label}</Text>
      <Text style={detail.insightValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function createDetailStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerSafe: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: { gap: 2 },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  loader: { marginVertical: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  insightsCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightChip: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  insightValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  analysisCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  analysisText: { fontSize: 15, color: colors.textSilver, lineHeight: 24 },
  timestamp: { fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 4 },
});
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: colors.surfaceHover, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  countText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filters: { paddingHorizontal: 18, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHover },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryForeground, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  list: { gap: 12 },
  empty: { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  emptyText: { fontSize: 13.5, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
});
}
