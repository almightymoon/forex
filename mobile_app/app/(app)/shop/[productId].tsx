import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { GlassCard } from '../../../components/GlassCard';
import { MenuStackHeader } from '../../../components/navigation/MenuStackHeader';
import { ShopCartBadge } from '../../../components/shop/ShopCartBadge';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useShopCart } from '../../../contexts/ShopCartContext';
import { getAuthToken } from '../../../utils/api';
import {
  fetchShopProduct,
  formatUsd,
  getProductImageUrl,
  type ShopProduct,
} from '../../../utils/publicProducts';

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function ShopProductScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId =
    typeof params.productId === 'string'
      ? params.productId
      : Array.isArray(params.productId)
        ? params.productId[0]
        : '';
  const { addItem } = useShopCart();

  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const load = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchShopProduct(productId, 'reload');
    setProduct(data);
    setActiveImage(data?.primaryImage || data?.galleryImages?.[0] || null);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const imgs = [
      ...(product.primaryImage ? [product.primaryImage] : []),
      ...(product.galleryImages || []).filter((img) => img !== product.primaryImage),
    ];
    return imgs;
  }, [product]);

  const requireAuth = async (): Promise<boolean> => {
    const token = await getAuthToken();
    if (token) return true;
    Alert.alert('Sign in required', 'Please sign in to purchase products.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign in', onPress: () => router.replace('/auth') },
    ]);
    return false;
  };

  const handleBuy = async () => {
    if (!product) return;
    if (!(await requireAuth())) return;
    router.push({
      pathname: '/payment',
      params: {
        type: 'product',
        productId: product.productId,
        productName: product.name,
        amount: String(product.price ?? 0),
      },
    } as never);
  };

  const handleAdd = () => {
    if (!product) return;
    addItem(product);
    setAdded(true);
    toast('Added to cart');
    setTimeout(() => setAdded(false), 1500);
  };

  if (!productId) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Product" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.muted}>Invalid product link.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Shop" onBack={() => router.back()} />
        <ActivityIndicator color={colors.text} style={styles.loader} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Not found" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons name="cube-outline" size={48} color={colors.textDim} />
          <Text style={styles.notFound}>Product not found</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Back to shop</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hero = getProductImageUrl(activeImage || product.primaryImage);
  const overview =
    product.longDescription?.trim() ||
    product.shortDescription?.trim() ||
    'Product overview coming soon.';
  const inside =
    product.outcomePromise?.trim() ||
    (product.tags?.length ? `Includes: ${product.tags.join(', ')}.` : '') ||
    product.shortDescription?.trim() ||
    'See details for what is included.';

  return (
    <View style={styles.screen}>
      <MenuStackHeader
        title="Product"
        subtitle={product.name}
        onBack={() => router.back()}
        right={<ShopCartBadge />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {hero ? (
          <Image source={{ uri: hero }} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="cube-outline" size={48} color={colors.textDim} />
          </View>
        )}

        {gallery.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {gallery.map((img) => {
              const uri = getProductImageUrl(img);
              const active = img === activeImage;
              return (
                <Pressable
                  key={img}
                  style={[styles.thumb, active && styles.thumbActive]}
                  onPress={() => setActiveImage(img)}
                >
                  <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <GlassCard contentStyle={styles.card}>
          <Text style={styles.code}>{product.productId.replace(/-/g, ' · ').toUpperCase()}</Text>
          <Text style={styles.title}>{product.name}</Text>
          {product.category ? <Text style={styles.category}>{product.category}</Text> : null}
          <Text style={styles.price}>{formatUsd(product.price)}</Text>
          {product.shortDescription ? (
            <Text style={styles.lead}>{product.shortDescription}</Text>
          ) : null}

          <Text style={styles.sectionLabel}>Overview</Text>
          <Text style={styles.body}>{overview}</Text>

          <Text style={styles.sectionLabel}>What&apos;s inside</Text>
          <Text style={styles.body}>{inside}</Text>

          {product.requirements ? (
            <>
              <Text style={styles.sectionLabel}>Requirements</Text>
              <Text style={styles.body}>{product.requirements}</Text>
            </>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={handleBuy}>
              <Text style={styles.primaryBtnText}>Buy now — {formatUsd(product.price)}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleAdd}>
              <Text style={styles.secondaryBtnText}>{added ? 'Added to cart' : 'Add to cart'}</Text>
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    loader: { marginTop: 48 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 10,
    },
    hero: {
      width: '100%',
      height: 260,
      borderRadius: 18,
      backgroundColor: colors.surfaceHover,
    },
    heroPlaceholder: {
      width: '100%',
      height: 260,
      borderRadius: 18,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbs: { gap: 8, paddingVertical: 4 },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbActive: { borderColor: colors.primary },
    thumbImg: { width: '100%', height: '100%' },
    card: { gap: 10 },
    code: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.textDim,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    category: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.cyan,
    },
    price: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.cyan,
      marginTop: 4,
    },
    lead: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: 12,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    actions: { gap: 10, marginTop: 16 },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    notFound: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    muted: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  });
}
