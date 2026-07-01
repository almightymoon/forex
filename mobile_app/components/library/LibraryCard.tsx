import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  RESOURCE_TYPE_LABELS,
  type LibraryItem,
  type LibraryResourceType,
  getLibraryAssetUrl,
} from '../../utils/publicLibrary';
import { GlassListCard } from '../glass/GlassListCard';

type Props = {
  item: LibraryItem;
  onPress: () => void;
};

function typeIcon(type: LibraryResourceType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'google_sheet':
      return 'grid-outline';
    case 'pdf':
    case 'document':
      return 'document-text-outline';
    case 'book':
      return 'book-outline';
    case 'video':
      return 'play-circle-outline';
    default:
      return 'link-outline';
  }
}

export function LibraryCard({ item, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cover = getLibraryAssetUrl(item.coverImage);

  return (
    <GlassListCard onPress={onPress} contentStyle={styles.card}>
      <View style={styles.media}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name={typeIcon(item.resourceType)} size={28} color={colors.cyan} />
          </View>
        )}
        <View style={styles.badges}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{RESOURCE_TYPE_LABELS[item.resourceType]}</Text>
          </View>
          {item.packageLabel && item.packageLabel !== 'All packages' ? (
            <View style={styles.pkgBadge}>
              <Text style={styles.pkgBadgeText} numberOfLines={1}>
                {item.packageLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.author}>{item.author || 'FX Navigators'}</Text>
      </View>
    </GlassListCard>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { padding: 0, overflow: 'hidden' },
    media: {
      height: 140,
      backgroundColor: colors.surfaceHover,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    cover: { ...StyleSheet.absoluteFillObject },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badges: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    typeBadge: {
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    typeBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    pkgBadge: {
      backgroundColor: 'rgba(79, 70, 229, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      maxWidth: '70%',
    },
    pkgBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    body: { padding: 14, gap: 4 },
    category: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.cyan,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      lineHeight: 21,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: 2,
    },
    author: {
      fontSize: 11,
      color: colors.textDim,
      marginTop: 6,
    },
  });
}
