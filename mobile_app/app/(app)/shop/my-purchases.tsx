import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MenuStackHeader } from '../../../components/navigation/MenuStackHeader';
import { GlassCard } from '../../../components/GlassCard';
import { GlassEmptyState } from '../../../components/glass/GlassPressable';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  fetchMyProductPurchases,
  formatUsd,
  getProductImageUrl,
  type ProductPurchase,
} from '../../../utils/publicProducts';
import { getAuthToken } from '../../../utils/api';

export default function ShopMyPurchasesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchases, setPurchases] = useState<ProductPurchase[]>([]);

  const load = useCallback(async (force = false) => {
    const token = await getAuthToken();
    if (!token) {
      router.replace('/auth');
      return;
    }
    const data = await fetchMyProductPurchases();
    setPurchases(data);
    setLoading(false);
    setRefreshing(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const openDelivery = async (url?: string | null) => {
    if (!url) return;
    const full = getProductImageUrl(url);
    if (await Linking.canOpenURL(full)) {
      await Linking.openURL(full);
    }
  };

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="My purchases" subtitle="Confirmed shop orders" onBack={() => router.back()} />
      <ScrollView
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
          <ActivityIndicator color={colors.text} style={styles.loader} />
        ) : purchases.length === 0 ? (
          <View style={styles.emptyWrap}>
            <GlassEmptyState
              title="No purchases yet"
              message="Products appear here once your USDT payment is confirmed."
            />
            <Pressable style={styles.shopBtn} onPress={() => router.push('/(app)/shop' as never)}>
              <Text style={styles.shopBtnText}>Browse shop</Text>
            </Pressable>
          </View>
        ) : (
          purchases.map((purchase) => {
            const { product } = purchase;
            const image = getProductImageUrl(product.primaryImage);
            return (
              <GlassCard key={purchase.paymentId} contentStyle={styles.card}>
                <View style={styles.row}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="cube-outline" size={24} color={colors.textDim} />
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={styles.code}>{product.productId.toUpperCase()}</Text>
                    <Text style={styles.name}>{product.name}</Text>
                    {product.shortDescription ? (
                      <Text style={styles.desc} numberOfLines={2}>
                        {product.shortDescription}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      {new Date(purchase.purchasedAt).toLocaleDateString()} · {formatUsd(purchase.amount)}
                      {product.currentVersion ? ` · ${product.currentVersion}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => router.push(`/(app)/shop/${product.productId}` as never)}
                  >
                    <Text style={styles.secondaryBtnText}>View product</Text>
                  </Pressable>
                  {product.deliveryUrl ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => openDelivery(product.deliveryUrl)}
                    >
                      <Ionicons name="download-outline" size={16} color={colors.primaryForeground} />
                      <Text style={styles.primaryBtnText}>Download</Text>
                    </Pressable>
                  ) : null}
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    loader: { marginTop: 48 },
    emptyWrap: { paddingTop: 24 },
    shopBtn: {
      marginTop: 16,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    shopBtnText: { color: colors.primaryForeground, fontWeight: '800', fontSize: 15 },
    card: { gap: 12 },
    row: { flexDirection: 'row', gap: 12 },
    thumb: { width: 80, height: 80, borderRadius: 12 },
    thumbPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 4 },
    code: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.textDim,
      textTransform: 'uppercase',
    },
    name: { fontSize: 16, fontWeight: '800', color: colors.text },
    desc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    meta: { fontSize: 11, color: colors.textDim, marginTop: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    primaryBtnText: { fontSize: 13, fontWeight: '800', color: colors.primaryForeground },
    secondaryBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    secondaryBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  });
}
