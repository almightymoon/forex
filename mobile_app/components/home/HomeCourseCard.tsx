import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { courseLevelAccent } from '../../utils/courseLevelAccent';
import { GlassCard } from '../GlassCard';

type Props = {
  title: string;
  level?: string;
  thumbnail?: string;
  lessonCount?: number;
  progress?: number;
  onPress?: () => void;
};

export function HomeCourseCard({
  title,
  level = 'Beginner',
  thumbnail,
  lessonCount,
  progress = 0,
  onPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const accent = courseLevelAccent(level, isDark);
  const pct = Math.min(Math.round(progress), 100);

  return (
    <Pressable style={({ pressed }) => [styles.outer, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard contentStyle={styles.cardInner} radius={20}>
        <View style={styles.thumbWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <LinearGradient colors={accent.stripe} style={styles.thumbPlaceholder}>
              <Ionicons name="school-outline" size={24} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.thumbGradient} pointerEvents="none" />
          <Text style={styles.thumbTitle} numberOfLines={2}>{title}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.level}>{level}</Text>
            {lessonCount != null ? <Text style={styles.lessons}>{lessonCount} lessons</Text> : null}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    outer: {
      width: '100%',
      marginBottom: 12,
    },
    pressed: { opacity: 0.96 },
    cardInner: { padding: 0, overflow: 'hidden' },
    thumbWrap: {
      height: 100,
      position: 'relative',
      backgroundColor: colors.surfaceHover,
    },
    thumbImage: { width: '100%', height: '100%' },
    thumbPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbGradient: { ...StyleSheet.absoluteFillObject },
    thumbTitle: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 10,
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 19,
      letterSpacing: -0.2,
    },
    body: { padding: 12, gap: 8 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    level: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'capitalize',
    },
    lessons: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    progressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? colors.surfaceInset : colors.surfaceHover,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
  });
}
