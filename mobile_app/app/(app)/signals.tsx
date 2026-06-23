import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import { GlassListCard } from '../../components/glass/GlassListCard';
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3AADFF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
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
                pair={s.pair}
                direction={s.direction}
                entry={s.entryPrice}
                stopLoss={s.stopLoss}
                takeProfit={s.takeProfit}
                status={s.status}
                pips={s.pips}
                createdAt={s.createdAt}
                onPress={() => openDetail(s)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Signal detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <View style={detail.screen}>
          <View style={detail.header}>
            <Text style={detail.headerTitle}>Signal Details</Text>
            <Pressable onPress={() => setSelected(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          {selected ? (
            <ScrollView contentContainerStyle={detail.content} showsVerticalScrollIndicator={false}>
              {/* Direction hero */}
              <LinearGradient
                colors={selected.direction === 'BUY' ? ['rgba(0,96,230,0.3)', 'rgba(0,96,230,0.05)'] : ['rgba(255,90,90,0.3)', 'rgba(255,90,90,0.05)']}
                style={detail.hero}
              >
                <View style={[detail.dirBadge, { backgroundColor: selected.direction === 'BUY' ? 'rgba(58,173,255,0.2)' : 'rgba(255,90,90,0.2)' }]}>
                  <Text style={[detail.dirText, { color: selected.direction === 'BUY' ? '#3AADFF' : '#FF5A5A' }]}>{selected.direction}</Text>
                </View>
                <Text style={detail.heroPair}>{selected.pair.replace(/\s/g, '').toUpperCase()}</Text>
                {selected.status === 'active' && <View style={detail.liveDot} />}
                <Text style={[detail.heroStatus, { color: selected.status === 'active' ? '#4ADE80' : selected.status === 'pending' ? '#FFC107' : 'rgba(255,255,255,0.4)' }]}>
                  {selected.status.toUpperCase()}
                </Text>
                {selected.timeframe ? <Text style={detail.heroTf}>{selected.timeframe} timeframe</Text> : null}
              </LinearGradient>

              {detailLoading ? <ActivityIndicator color="#3AADFF" style={{ marginVertical: 12 }} /> : null}

              {/* Metrics */}
              <GlassListCard contentStyle={detail.metricsGrid}>
                <DetailMetric label="Entry Price" value={selected.entryPrice} />
                <DetailMetric label="Take Profit" value={selected.takeProfit} color="#4ADE80" />
                <DetailMetric label="Stop Loss" value={selected.stopLoss} color="#FF5A5A" />
                {selected.pips ? <DetailMetric label="Pips" value={selected.pips.startsWith('+') || selected.pips.startsWith('-') ? selected.pips : `+${selected.pips}`} color={selected.pips?.startsWith('-') ? '#FF5A5A' : '#4ADE80'} /> : null}
                {selected.riskRewardRatio ? <DetailMetric label="Risk / Reward" value={`1 : ${selected.riskRewardRatio.toFixed(2)}`} /> : null}
                {selected.confidence ? <DetailMetric label="Confidence" value={`${selected.confidence}%`} /> : null}
                {selected.invalidationLevel ? <DetailMetric label="Invalidation" value={selected.invalidationLevel} color="#FFC107" /> : null}
              </GlassListCard>

              {/* Analysis */}
              {selected.description ? (
                <GlassListCard contentStyle={detail.analysisBox}>
                  <Text style={detail.analysisLabel}>Analysis</Text>
                  <Text style={detail.analysisText}>{selected.description}</Text>
                </GlassListCard>
              ) : null}

              {/* Notes */}
              {selected.notes ? (
                <GlassListCard contentStyle={detail.analysisBox}>
                  <Text style={detail.analysisLabel}>Notes</Text>
                  <Text style={detail.analysisText}>{selected.notes}</Text>
                </GlassListCard>
              ) : null}

              {selected.createdAt ? (
                <Text style={detail.timestamp}>
                  Published {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function DetailMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={detail.metricRow}>
      <Text style={detail.metricLabel}>{label}</Text>
      <Text style={[detail.metricValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const detail = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#040818' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  dirBadge: { borderRadius: 30, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 4 },
  dirText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  heroPair: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  heroStatus: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  heroTf: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  metricsGrid: { padding: 4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  metricLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
  analysisBox: { padding: 16, gap: 8 },
  analysisLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase' },
  analysisText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
  timestamp: { fontSize: 11.5, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  countBadge: { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },
  filters: { paddingHorizontal: 18, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  chipActive: { backgroundColor: 'rgba(0,96,230,0.2)', borderColor: '#3AADFF' },
  chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  chipTextActive: { color: '#3AADFF' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 32 },
  list: { gap: 12 },
  empty: { alignItems: 'center', marginTop: 48, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyText: { fontSize: 13.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
});
