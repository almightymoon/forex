import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { useShopCart } from '../../../contexts/ShopCartContext';
import { getAuthToken } from '../../../utils/api';
import { formatUsd, getProductImageUrl } from '../../../utils/publicProducts';

export default function ShopCartScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { items, total, removeItem, setQuantity, isReady } = useShopCart();

  const handleCheckout = async () => {
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.replace('/auth') },
      ]);
      return;
    }
    router.push({
      pathname: '/payment',
      params: { type: 'cart', amount: String(total) },
    } as never);
  };

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Cart" subtitle="Review your order" onBack={() => router.back()} />
      {!isReady ? (
        <ActivityIndicator color={colors.text} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <GlassEmptyState
            title="Your cart is empty"
            message="Browse the shop and add items to your cart."
          />
          <Pressable style={styles.shopBtn} onPress={() => router.push('/(app)/shop' as never)}>
            <Text style={styles.shopBtnText}>Browse shop</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const image = getProductImageUrl(item.primaryImage);
            return (
              <GlassCard key={item.productId} contentStyle={styles.row}>
                <Pressable
                  onPress={() => router.push(`/(app)/shop/${item.productId}` as never)}
                  style={styles.thumbWrap}
                >
                  {image ? (
                    <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="cube-outline" size={22} color={colors.textDim} />
                    </View>
                  )}
                </Pressable>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.unit}>{formatUsd(item.price)} each</Text>
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => setQuantity(item.productId, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </Pressable>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => setQuantity(item.productId, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.lineEnd}>
                  <Text style={styles.lineTotal}>{formatUsd(item.price * item.quantity)}</Text>
                  <Pressable onPress={() => removeItem(item.productId)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </GlassCard>
            );
          })}

          <GlassCard contentStyle={styles.summary}>
            <Text style={styles.summaryTitle}>Order summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({items.reduce((n, i) => n + i.quantity, 0)} items)
              </Text>
              <Text style={styles.summaryAmount}>{formatUsd(total)}</Text>
            </View>
            <Text style={styles.summaryNote}>
              Pay via USDT (TRC20). Access unlocks after admin confirms your payment.
            </Text>
            <Pressable style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutBtnText}>Checkout — {formatUsd(total)}</Text>
            </Pressable>
          </GlassCard>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: 48 },
    emptyWrap: { flex: 1, padding: 16, justifyContent: 'center' },
    shopBtn: {
      marginTop: 16,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    shopBtnText: { color: colors.primaryForeground, fontWeight: '800', fontSize: 15 },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    thumbWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%' },
    thumbPlaceholder: {
      flex: 1,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 4 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text },
    unit: { fontSize: 12, color: colors.textMuted },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    qtyBtn: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    qty: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 20, textAlign: 'center' },
    lineEnd: { alignItems: 'flex-end', gap: 10 },
    lineTotal: { fontSize: 15, fontWeight: '800', color: colors.text },
    summary: { gap: 10, marginTop: 8 },
    summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: colors.textMuted },
    summaryAmount: { fontSize: 18, fontWeight: '800', color: colors.cyan },
    summaryNote: { fontSize: 12, lineHeight: 18, color: colors.textDim },
    checkoutBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    checkoutBtnText: { fontSize: 15, fontWeight: '800', color: colors.primaryForeground },
  });
}
