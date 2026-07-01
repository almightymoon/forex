import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInstructor } from '../utils/formatInstructor';

type Props = {
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  progress?: number;
  thumbnail?: string;
  lessonCount?: number;
  onPress?: () => void;
};

export function CourseCard({
  title,
  instructor,
  progress = 0,
  thumbnail,
  lessonCount,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const thumbFade = isDark
    ? (['rgba(28,28,30,0)', 'rgba(28,28,30,0.45)'] as const)
    : (['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)'] as const);
  const instructorName = formatInstructor(instructor);
  const pct = Math.min(Math.round(progress), 100);
  const hasProgress = pct > 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={styles.cardShell}>
        <View style={styles.thumbWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} cachePolicy="memory-disk" contentFit="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="play-circle-outline" size={32} color={colors.brandPurple} />
            </View>
          )}
          <LinearGradient
            colors={thumbFade}
            locations={[0.6, 1]}
            style={styles.thumbGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[colors.brandPurple, colors.brandPurpleDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStripe}
            pointerEvents="none"
          />
          <View style={styles.progressRing}>
            <Text style={styles.progressRingText}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyTop}>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{hasProgress ? 'In progress' : 'Enrolled'}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {instructorName ? (
                <Text style={styles.instructor} numberOfLines={1}>
                  {instructorName}
                </Text>
              ) : null}
            </View>
            <View style={styles.resumeIcon}>
              <Ionicons name="play" size={14} color={colors.primaryForeground} style={{ marginLeft: 2 }} />
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              {lessonCount ? (
                <Text style={styles.lessonCount}>{lessonCount} lessons</Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardBg = isDark ? colors.surface : '#FFFFFF';
  const insetBg = isDark ? colors.surfaceInset : '#F4F4F5';
  const pillBg = isDark ? colors.backgroundElevated : 'rgba(255,255,255,0.92)';

  return StyleSheet.create({
    pressed: { opacity: 0.96 },
    cardShell: {
      borderRadius: 20,
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
      height: 112,
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
      backgroundColor: insetBg,
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
    progressRing: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: pillBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressRingText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      fontVariant: ['tabular-nums'],
    },
    body: {
      padding: 14,
      gap: 12,
      backgroundColor: cardBg,
    },
    bodyTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    copy: {
      flex: 1,
      gap: 3,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 22,
      letterSpacing: -0.3,
    },
    instructor: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
      marginTop: 2,
    },
    resumeIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    progressBlock: {
      gap: 7,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    lessonCount: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textDim,
    },
    progressTrack: {
      height: 6,
      backgroundColor: insetBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
  });
}
