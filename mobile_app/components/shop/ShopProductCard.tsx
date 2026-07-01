import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatUsd, getProductImageUrl, type ShopProduct } from '../../utils/publicProducts';
import { GlassListCard } from '../glass/GlassListCard';

type Props = {
  product: ShopProduct;
  onPress: () => void;
  onAddToCart: () => void;
  added?: boolean;
};

export function ShopProductCard({ product, onPress, onAddToCart, added }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const image = getProductImageUrl(product.primaryImage);

  return (
    <GlassListCard onPress={onPress} contentStyle={styles.card}>
      <View style={styles.media}>
        {image ? (
          <Image source={{ uri: image }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="cube-outline" size={32} color={colors.textDim} />
          </View>
        )}
        {product.category ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.category}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.code}>{product.productId.replace(/-/g, ' · ').toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        {product.shortDescription ? (
          <Text style={styles.desc} numberOfLines={2}>
            {product.shortDescription}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatUsd(product.price)}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.viewBtn} onPress={onPress}>
              <Text style={styles.viewBtnText}>View</Text>
            </Pressable>
            <Pressable style={styles.cartBtn} onPress={onAddToCart}>
              <Text style={styles.cartBtnText}>{added ? 'Added' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GlassListCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { padding: 0, overflow: 'hidden' },
    media: {
      height: 160,
      backgroundColor: colors.surfaceHover,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cover: { ...StyleSheet.absoluteFillObject },
    placeholder: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    body: { padding: 14, gap: 4 },
    code: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: colors.textDim,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      lineHeight: 22,
    },
    desc: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: 2,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 8,
    },
    price: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.cyan,
    },
    actions: { flexDirection: 'row', gap: 8 },
    viewBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    viewBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
    cartBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    cartBtnText: { fontSize: 12, fontWeight: '800', color: colors.primaryForeground },
  });
}
