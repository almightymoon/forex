import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassCard } from '../../../components/GlassCard';
import { MenuStackHeader } from '../../../components/navigation/MenuStackHeader';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  RESOURCE_TYPE_LABELS,
  fetchLibraryItem,
  getLibraryAssetUrl,
  libraryOpenLabel,
  libraryResourceUrl,
  type LibraryItem,
} from '../../../utils/publicLibrary';

export default function LibraryItemScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : Array.isArray(params.itemId) ? params.itemId[0] : '';

  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchLibraryItem(itemId, 'reload');
    setItem(data);
    setLoading(false);
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const openResource = async () => {
    if (!item?.hasAccess) return;
    const url = libraryResourceUrl(item);
    if (!url) {
      Alert.alert('Unavailable', 'No file or link is attached to this resource yet.');
      return;
    }
    setOpening(true);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Cannot open', 'This link is not supported on your device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open this resource. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  const promptUpgrade = () => {
    const message = item?.packageLabel
      ? `This resource is included with: ${item.packageLabel}. Upgrade your package to access it.`
      : 'This resource is not included with your current package.';
    Alert.alert('Upgrade required', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'View plans', onPress: () => router.push('/subscription-upgrade' as never) },
    ]);
  };

  if (!itemId) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Resource" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.muted}>Invalid resource link.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Library" onBack={() => router.back()} />
        <ActivityIndicator color={colors.text} style={styles.loader} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.screen}>
        <MenuStackHeader title="Not found" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons name="book-outline" size={48} color={colors.textDim} />
          <Text style={styles.notFoundTitle}>Resource not found</Text>
          <Text style={styles.muted}>It may have been removed or is not in your package.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Back to library</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const cover = getLibraryAssetUrl(item.coverImage);
  const canOpen = item.hasAccess && Boolean(libraryResourceUrl(item));
  const locked = item.locked || !item.hasAccess;

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Resource" subtitle={item.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.hero} contentFit="cover" />
        ) : null}

        <GlassCard contentStyle={styles.card}>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{RESOURCE_TYPE_LABELS[item.resourceType]}</Text>
            </View>
            {item.category ? (
              <View style={[styles.badge, styles.badgeMuted]}>
                <Text style={[styles.badgeText, styles.badgeTextMuted]}>{item.category}</Text>
              </View>
            ) : null}
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                {item.packageLabel || 'All packages'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          {item.author ? <Text style={styles.author}>By {item.author}</Text> : null}
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tags}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {canOpen ? (
            <Pressable
              style={[styles.primaryBtn, opening && styles.primaryBtnDisabled]}
              onPress={openResource}
              disabled={opening}
            >
              <Ionicons
                name={item.fileUrl ? 'download-outline' : 'open-outline'}
                size={18}
                color={colors.primaryForeground}
              />
              <Text style={styles.primaryBtnText}>
                {opening ? 'Opening…' : libraryOpenLabel(item)}
              </Text>
            </Pressable>
          ) : locked ? (
            <View style={styles.lockBox}>
              <View style={styles.lockTitleRow}>
                <Ionicons name="lock-closed" size={18} color={colors.gold} />
                <Text style={styles.lockTitle}>Resource locked</Text>
              </View>
              <Text style={styles.lockMessage}>
                {item.packageLabel
                  ? `Included with: ${item.packageLabel}. Your package does not include access.`
                  : 'This resource is not included with your current package.'}
              </Text>
              <Pressable style={styles.primaryBtn} onPress={promptUpgrade}>
                <Text style={styles.primaryBtnText}>View plans</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.muted}>No file or link attached yet.</Text>
          )}
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
      height: 200,
      borderRadius: 18,
      backgroundColor: colors.surfaceHover,
    },
    card: { gap: 12 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: {
      backgroundColor: colors.cyan,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    badgeMuted: {
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.background,
    },
    badgeTextMuted: { color: colors.textMuted },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      lineHeight: 30,
    },
    author: { fontSize: 13, color: colors.textMuted },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: { fontSize: 12, color: colors.textMuted },
    primaryBtn: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.text, fontWeight: '700' },
    lockBox: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.gold,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8,
    },
    lockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lockTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    lockMessage: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    notFoundTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginTop: 8,
    },
    muted: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  });
}
