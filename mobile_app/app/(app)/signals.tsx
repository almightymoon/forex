import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignalCard } from '../../components/SignalCard';
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

  const fetchSignals = async () => {
    try {
      const res = await apiFetch('api/signals');
      if (res.ok) {
        const raw = await res.json();
        setSignals(normalizeList<Record<string, unknown>>(raw).map(normalizeSignal));
      }
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSignals(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSignals(); };

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
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No signals {filter !== 'all' ? `(${filter})` : ''}</Text>
            <Text style={styles.emptyText}>Signals will appear here once published by your instructor.</Text>
          </View>
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
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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
