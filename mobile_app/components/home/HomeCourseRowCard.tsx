import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { courseLevelAccent } from '../../utils/courseLevelAccent';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  level?: string;
  thumbnail?: string;
  lessonCount?: number;
  progress?: number;
  onPress?: () => void;
  onMenuPress?: () => void;
};

export function HomeCourseRowCard({
  title,
  level = 'Beginner',
  thumbnail,
  lessonCount,
  progress = 0,
  onPress,
  onMenuPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const accent = courseLevelAccent(level, isDark);
  const pct = Math.min(Math.round(progress), 100);
  const showProgress = pct > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${level}${lessonCount != null ? `, ${lessonCount} lessons` : ''}${showProgress ? `, ${pct}% complete` : ''}`}
    >
      <GlassCard contentStyle={styles.inner} radius={20}>
        <View style={styles.thumbWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <LinearGradient colors={accent.stripe} style={styles.thumbPlaceholder}>
              <Ionicons name="school-outline" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Pressable
              style={styles.menuBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onMenuPress?.();
              }}
              hitSlop={8}
              accessibilityLabel="Course options"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.levelPill, { backgroundColor: `${accent.glow}18` }]}>
              <Text style={[styles.level, { color: accent.glow }]}>{level}</Text>
            </View>
            {lessonCount != null ? (
              <Text style={styles.lessons}>{lessonCount} Lessons</Text>
            ) : null}
          </View>

          {showProgress ? (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.brandPurple }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.brandPurple }]}>{pct}%</Text>
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    outer: {
      marginBottom: 12,
    },
    pressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
    inner: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
      padding: 12,
    },
    thumbWrap: {
      width: 72,
      height: 72,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: isDark ? colors.surfaceInset : colors.surfaceHover,
      flexShrink: 0,
      alignSelf: 'center',
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
    body: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      gap: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    menuBtn: {
      padding: 2,
      marginTop: -2,
      flexShrink: 0,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    levelPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    level: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    lessons: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressTrack: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? colors.surfaceInset : colors.surfaceHover,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      minWidth: 28,
      textAlign: 'right',
    },
  });
}
