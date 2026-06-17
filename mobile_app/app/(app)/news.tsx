import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { NewsCard } from '../../components/NewsCard';
import { colors } from '../../constants/theme';
import { apiFetch } from '../../utils/api';
import { NormalizedNews, normalizeList, normalizeNews } from '../../utils/normalize';

type FilterKey = 'all' | 'ForexLive' | 'FXStreet';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'ForexLive', label: 'ForexLive' },
  { key: 'FXStreet', label: 'FXStreet' },
];

function sectionLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startNotif = new Date(d);
  startNotif.setHours(0, 0, 0, 0);

  if (startNotif.getTime() === startToday.getTime()) return 'Today';

  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (startNotif.getTime() === startYesterday.getTime()) return 'Yesterday';

  return 'Earlier';
}

function groupArticles(items: NormalizedNews[]) {
  const order = ['Today', 'Yesterday', 'Earlier'] as const;
  const buckets: Record<string, NormalizedNews[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const item of items) {
    buckets[sectionLabel(item.publishedAt)].push(item);
  }

  return order
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0);
}

export default function NewsScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<NormalizedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const fetchNews = async () => {
    try {
      const res = await apiFetch('api/news?limit=30');
      if (res.ok) {
        const data = await res.json();
        setArticles(normalizeList<Record<string, unknown>>(data).map(normalizeNews));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? articles : articles.filter((a) => a.source === filter)),
    [articles, filter],
  );
  const grouped = useMemo(() => groupArticles(filtered), [filtered]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <View style={styles.backIcon}>
              <AppIcon name="chevron-right" size={20} color={colors.text} strokeWidth={2.2} />
            </View>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>Market News</Text>
            <Text style={styles.subtitle}>Live forex headlines</Text>
          </View>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = f.key === 'all' ? articles.length : articles.filter((a) => a.source === f.key).length;
            return (
              <Pressable
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                {count > 0 ? <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNews(); }} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.cyan} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <AppIcon name="file-text" size={34} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.emptyTitle}>No headlines right now</Text>
            <Text style={styles.emptyText}>Pull to refresh and try again in a moment.</Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.label}</Text>
              <View style={styles.list}>
                {group.items.map((item, index) => (
                  <View key={item.id} style={index > 0 ? styles.itemGap : undefined}>
                    <NewsCard item={item} onPress={() => item.url && Linking.openURL(item.url)} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  titleBlock: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filters: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderColor: 'rgba(0,212,255,0.35)',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.cyan, fontWeight: '700' },
  chipCount: { fontSize: 11, fontWeight: '800', color: colors.textDim },
  chipCountActive: { color: colors.cyan },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  loader: { marginTop: 48 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  list: {},
  itemGap: { marginTop: 10 },
  empty: {
    alignItems: 'center',
    marginTop: 72,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textSecondary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
