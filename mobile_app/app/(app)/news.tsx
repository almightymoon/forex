import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExploreScreenHeader } from '../../components/explore/ExploreScreenHeader';
import { createExploreChipStyles } from '../../components/explore/exploreStyles';
import { NewsCard } from '../../components/NewsCard';
import { GlassEmptyState } from '../../components/glass/GlassPressable';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';
import { openNewsArticle } from '../../utils/openNews';
import { NormalizedNews, dedupeByKey, normalizeList, normalizeNews } from '../../utils/normalize';

type FilterKey = 'all' | 'ForexLive' | 'FXStreet' | 'ForexFactory';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'ForexLive', label: 'ForexLive' },
  { key: 'FXStreet', label: 'FXStreet' },
  { key: 'ForexFactory', label: 'Forex Factory' },
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
  const router = useRouter();
  const [articles, setArticles] = useState<NormalizedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const fetchNews = async (force = false) => {
    try {
      const res = await apiFetch('api/news?limit=30', { cache: force ? 'reload' : 'default' });
      if (res.ok) {
        const data = await res.json();
        const list = normalizeList<Record<string, unknown>>(data).map(normalizeNews);
        setArticles(dedupeByKey(list, (item) => item.url || item.id));
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
      <ExploreScreenHeader
        showBack
        eyebrow="Markets"
        title="Market News"
        subtitle="Headlines and analysis from top forex sources"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = f.key === 'all' ? articles.length : articles.filter((a) => a.source === f.key).length;
            return (
              <Pressable
                key={f.key}
                style={[exploreChipStyles.chip, active && exploreChipStyles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[exploreChipStyles.chipText, active && exploreChipStyles.chipTextActive]}>{f.label}</Text>
                {count > 0 ? (
                  <Text style={[exploreChipStyles.chipCount, active && exploreChipStyles.chipCountActive]}>{count}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </ExploreScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNews(true);
            }}
            tintColor={colors.black}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <GlassEmptyState
            title="No headlines right now"
            message="Pull to refresh and try again in a moment."
          />
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.section}>
              <Text style={exploreChipStyles.sectionTitle}>{group.label}</Text>
              <View style={styles.list}>
                {group.items.map((item, index) => (
                  <View key={`${group.label}-${item.id}-${index}`} style={index > 0 ? styles.itemGap : undefined}>
                    <NewsCard item={item} onPress={() => openNewsArticle(router, item)} />
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  filters: { gap: 8, paddingBottom: 4 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  loader: { marginTop: 48 },
  section: { marginBottom: 20 },
  list: {},
  itemGap: { marginTop: 12 },
});
}
