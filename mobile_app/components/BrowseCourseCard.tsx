import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInstructor } from '../utils/formatInstructor';
import { courseLevelAccent } from '../utils/courseLevelAccent';

type Props = {
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  instructorImage?: string;
  thumbnail?: string;
  level?: string;
  rating?: number;
  lessonCount?: number;
  ctaLabel?: string;
  onCtaPress?: () => void;
  onPress?: () => void;
};

function getAccent(level?: string, isDark?: boolean) {
  return courseLevelAccent(level, isDark);
}

export function BrowseCourseCard({
  title,
  instructor,
  instructorImage,
  thumbnail,
  level,
  rating,
  lessonCount,
  ctaLabel,
  onCtaPress,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const accent = useMemo(() => getAccent(level, isDark), [level, isDark]);
  const thumbFade = isDark
    ? (['rgba(28,28,30,0)', 'rgba(28,28,30,0.55)'] as const)
    : (['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)'] as const);

  const instructorName = formatInstructor(instructor);
  const levelLabel = level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Course';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={styles.cardShell}>
        <View style={styles.thumbWrap}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbImage}
              cachePolicy="memory-disk"
              contentFit="cover"
            />
          ) : (
            <LinearGradient colors={accent.stripe} style={styles.thumbPlaceholder}>
              <Ionicons name="school-outline" size={36} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}

          <LinearGradient
            colors={thumbFade}
            locations={[0.55, 1]}
            style={styles.thumbGradient}
            pointerEvents="none"
          />

          <LinearGradient
            colors={accent.stripe}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStripe}
            pointerEvents="none"
          />

          <View style={styles.thumbTopRow}>
            <View style={styles.levelPill}>
              <View style={[styles.levelDot, { backgroundColor: accent.glow }]} />
              <Text style={styles.levelPillText}>{levelLabel}</Text>
            </View>
            {typeof rating === 'number' && rating > 0 ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={11} color={colors.gold} />
                <Text style={styles.ratingPillText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.playBadge}>
            <Ionicons name="play" size={16} color={colors.primaryForeground} style={{ marginLeft: 2 }} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {instructorName ? (
            <View style={styles.instructorRow}>
              {instructorImage ? (
                <Image
                  source={{ uri: instructorImage }}
                  style={styles.avatarImage}
                  cachePolicy="memory-disk"
                  recyclingKey={instructorImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={11} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.instructorCopy}>
                <Text style={styles.instructorLabel}>Instructor</Text>
                <Text style={styles.instructor} numberOfLines={1}>
                  {instructorName}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="book-outline" size={13} color={colors.primary} />
              <Text style={styles.metaChipText}>Forex curriculum</Text>
            </View>
            {lessonCount && lessonCount > 0 ? (
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
                <Text style={styles.metaChipText}>{lessonCount} lessons</Text>
              </View>
            ) : null}
          </View>

          {ctaLabel && onCtaPress ? (
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={onCtaPress}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primaryForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const insetBg = isDark ? colors.surfaceInset : '#F4F4F5';
  const pillBg = isDark ? colors.backgroundElevated : 'rgba(255,255,255,0.94)';
  const pillBorder = isDark ? colors.border : 'rgba(0,0,0,0.08)';

  return StyleSheet.create({
    pressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },
    cardShell: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : 0.06,
      shadowRadius: isDark ? 16 : 12,
      elevation: isDark ? 4 : 2,
    },
    thumbWrap: {
      width: '100%',
      height: 148,
      position: 'relative',
      backgroundColor: insetBg,
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    thumbPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    accentStripe: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    thumbTopRow: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    levelPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: pillBg,
      borderWidth: 1,
      borderColor: pillBorder,
    },
    levelDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    levelPillText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: pillBg,
      borderWidth: 1,
      borderColor: pillBorder,
    },
    ratingPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    playBadge: {
      position: 'absolute',
      right: 14,
      bottom: 14,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    body: {
      padding: 16,
      gap: 12,
      backgroundColor: cardBg,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.35,
      lineHeight: 23,
    },
    instructorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: insetBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructorCopy: {
      flex: 1,
      gap: 1,
    },
    instructorLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textDim,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    instructor: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: insetBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    ctaPressed: {
      opacity: 0.9,
    },
    ctaText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryForeground,
      letterSpacing: -0.2,
    },
  });
}
