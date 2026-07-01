import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { ExploreScreenHeader } from '../../../components/explore/ExploreScreenHeader';
import { createExploreChipStyles } from '../../../components/explore/exploreStyles';
import { ShopCartBadge } from '../../../components/shop/ShopCartBadge';
import { ShopProductCard } from '../../../components/shop/ShopProductCard';
import { GlassEmptyState } from '../../../components/glass/GlassPressable';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useShopCart } from '../../../contexts/ShopCartContext';
import { fetchShopProducts, type ShopProduct } from '../../../utils/publicProducts';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function ShopScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
  const router = useRouter();
  const { addItem } = useShopCart();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchShopProducts({
        category: category || undefined,
        search: debouncedSearch || undefined,
        limit: 100,
        cache: force ? 'reload' : 'default',
      });
      setProducts(data.products);
      setCategories(data.categories);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleAdd = (product: ShopProduct) => {
    addItem(product);
    setAddedId(product.productId);
    toast('Added to cart');
    setTimeout(() => setAddedId(null), 1500);
  };

  const hasFilters = Boolean(category || debouncedSearch);
  const emptyMessage = hasFilters
    ? 'No products match your filters.'
    : 'No products available yet. Check back soon.';

  return (
    <View style={styles.screen}>
      <ExploreScreenHeader
        showBack
        eyebrow="Store"
        title="Shop"
        subtitle="Merch, tools, and premium resources"
        trailing={
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/(app)/shop/my-purchases' as never)}
              hitSlop={8}
            >
              <Ionicons name="bag-outline" size={20} color={colors.text} />
            </Pressable>
            <ShopCartBadge />
            <Pressable
              style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
              onPress={() => setShowSearch((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showSearch ? 'close' : 'search-outline'}
                size={20}
                color={showSearch ? colors.primaryForeground : colors.text}
              />
            </Pressable>
          </View>
        }
      >
        {showSearch ? (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products…"
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
      </ExploreScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.black}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.black} style={styles.loader} />
        ) : products.length === 0 ? (
          <GlassEmptyState title="Nothing here yet" message={emptyMessage} />
        ) : (
          <View style={styles.list}>
            {products.map((product, index) => (
              <View key={product.productId} style={index > 0 ? styles.itemGap : undefined}>
                <ShopProductCard
                  product={product}
                  added={addedId === product.productId}
                  onPress={() => router.push(`/(app)/shop/${product.productId}` as never)}
                  onAddToCart={() => handleAdd(product)}
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
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
