import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExploreScreenHeader } from '../../../components/explore/ExploreScreenHeader';
import { createExploreChipStyles } from '../../../components/explore/exploreStyles';
import { LibraryCard } from '../../../components/library/LibraryCard';
import { GlassEmptyState } from '../../../components/glass/GlassPressable';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  fetchLibraryItems,
  type LibraryItem,
  type LibraryResourceType,
} from '../../../utils/publicLibrary';

const TYPE_FILTERS: { id: LibraryResourceType | ''; label: string }[] = [
  { id: '', label: 'All types' },
  { id: 'google_sheet', label: 'Sheets' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'document', label: 'Docs' },
  { id: 'link', label: 'Links' },
  { id: 'book', label: 'Books' },
  { id: 'video', label: 'Videos' },
];

export default function LibraryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
  const router = useRouter();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [category, setCategory] = useState('');
  const [typeFilter, setTypeFilter] = useState<LibraryResourceType | ''>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchLibraryItems({
        category: category || undefined,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        limit: 100,
        cache: force ? 'reload' : 'default',
      });
      setItems(data.items);
      setCategories(data.categories);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, debouncedSearch, typeFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const hasFilters = Boolean(category || debouncedSearch || typeFilter);
  const emptyMessage = hasFilters
    ? 'No resources match your filters.'
    : 'No library resources yet. Check back soon.';

  return (
    <View style={styles.screen}>
      <ExploreScreenHeader
        showBack
        eyebrow="Resources"
        title="Library"
        subtitle="Google Sheets, PDFs, books, and curated links"
        trailing={
          <Pressable
            style={[styles.searchBtn, showSearch && styles.searchBtnActive]}
            onPress={() => setShowSearch((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={showSearch ? 'close' : 'search-outline'}
              size={20}
              color={showSearch ? colors.primaryForeground : colors.text}
            />
          </Pressable>
        }
      >
        {showSearch ? (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search resources…"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        ) : null}

        {categories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Pressable
              style={[exploreChipStyles.chip, !category && exploreChipStyles.chipActive]}
              onPress={() => setCategory('')}
            >
              <Text style={[exploreChipStyles.chipText, !category && exploreChipStyles.chipTextActive]}>
                All
              </Text>
            </Pressable>
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[exploreChipStyles.chip, active && exploreChipStyles.chipActive]}
                  onPress={() => setCategory(active ? '' : cat)}
                >
                  <Text style={[exploreChipStyles.chipText, active && exploreChipStyles.chipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {TYPE_FILTERS.map((t) => {
            const active = typeFilter === t.id;
            return (
              <Pressable
                key={t.id || 'all-types'}
                style={[exploreChipStyles.chip, active && exploreChipStyles.chipActive]}
                onPress={() => setTypeFilter(t.id)}
              >
                <Text style={[exploreChipStyles.chipText, active && exploreChipStyles.chipTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ExploreScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.black} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={styles.loader} />
        ) : items.length === 0 ? (
          <GlassEmptyState title="Nothing here yet" message={emptyMessage} />
        ) : (
          <View style={styles.list}>
            {items.map((item, index) => (
              <View key={item.itemId} style={index > 0 ? styles.itemGap : undefined}>
                <LibraryCard
                  item={item}
                  onPress={() => router.push(`/(app)/library/${item.itemId}` as never)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    searchBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    searchInput: {
      marginTop: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    filters: { gap: 8, paddingBottom: 4 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    loader: { marginTop: 48 },
    list: {},
    itemGap: { marginTop: 12 },
  });
}
