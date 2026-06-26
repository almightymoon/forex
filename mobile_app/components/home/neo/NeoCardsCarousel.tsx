import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { NormalizedCourse, NormalizedSignal } from '../../../utils/normalize';
import { courseLevelAccent } from '../../../utils/courseLevelAccent';
import { GlassCard } from '../../GlassCard';

type Props = {
  courses: NormalizedCourse[];
  topSignal?: NormalizedSignal;
  onCoursePress?: (id: string) => void;
  onSignalPress?: () => void;
  onBrowse?: () => void;
};

const CARD_W = 268;

function CarouselCourseCard({
  course,
  onPress,
  colors,
  isDark,
  styles,
}: {
  course: NormalizedCourse;
  onPress?: () => void;
  colors: AppColors;
  isDark: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const accent = courseLevelAccent(course.level, isDark);
  const pct = Math.min(Math.round(course.progress ?? 0), 100);
  const levelLabel = course.level
    ? course.level.charAt(0).toUpperCase() + course.level.slice(1)
    : 'Course';

  return (
    <Pressable style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard contentStyle={styles.cardInner} radius={20}>
        <View style={styles.thumbWrap}>
          {course.thumbnail ? (
            <Image
              source={{ uri: course.thumbnail }}
              style={styles.thumbImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <LinearGradient colors={accent.stripe} style={styles.thumbPlaceholder}>
              <Ionicons name="school-outline" size={28} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
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
          <View style={styles.levelPill}>
            <View style={[styles.levelDot, { backgroundColor: accent.glow }]} />
            <Text style={styles.levelText}>{levelLabel}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>
              {course.lessonCount ? `${course.lessonCount} lessons` : 'Tap to resume'}
            </Text>
            <View style={styles.resumeBtn}>
              <Ionicons name="play" size={12} color={colors.primaryForeground} style={{ marginLeft: 1 }} />
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function CarouselSignalCard({
  signal,
  onPress,
  colors,
  styles,
}: {
  signal: NormalizedSignal;
  onPress?: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const isBuy = signal.direction === 'BUY';
  return (
    <Pressable style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard contentStyle={styles.cardInner} radius={20}>
        <LinearGradient
          colors={['#141416', '#0B0B0D']}
          style={styles.signalHero}
        >
          <LinearGradient
            colors={isBuy ? ['rgba(52,199,89,0.25)', 'transparent'] : ['rgba(255,107,107,0.22)', 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.signalTop}>
            <View style={[styles.signalPill, isBuy ? styles.buyPill : styles.sellPill]}>
              <Text style={[styles.signalPillText, { color: isBuy ? colors.success : colors.sell }]}>
                {signal.direction}
              </Text>
            </View>
            <Ionicons name="pulse" size={16} color={colors.brandPurple} />
          </View>
          <Text style={styles.signalPair}>{signal.pair}</Text>
          <Text style={styles.signalEntry}>{signal.entryPrice}</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={styles.signalLabel}>Live signal</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>View in signals</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function EmptyCarouselCard({
  onPress,
  colors,
  isDark,
  styles,
}: {
  onPress?: () => void;
  colors: AppColors;
  isDark: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const accent = courseLevelAccent(undefined, isDark);
  return (
    <Pressable style={({ pressed }) => [styles.cardPress, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard contentStyle={styles.cardInner} radius={20}>
        <LinearGradient colors={accent.stripe} style={styles.emptyHero}>
          <Ionicons name="book-outline" size={32} color="rgba(255,255,255,0.92)" />
          <Text style={styles.emptyHeroTitle}>Start learning</Text>
          <Text style={styles.emptyHeroSub}>Browse forex courses</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={styles.cardTitle}>Your first course awaits</Text>
          <View style={[styles.ctaRow, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Browse catalog</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primaryForeground} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export function NeoCardsCarousel({ courses, topSignal, onCoursePress, onSignalPress, onBrowse }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const hasCourses = courses.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Your courses</Text>
        <Pressable onPress={onBrowse} hitSlop={8}>
          <Text style={styles.link}>Browse all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
        snapToInterval={CARD_W + 14}
      >
        {hasCourses ? (
          courses.map((course) => (
            <CarouselCourseCard
              key={course._id}
              course={course}
              onPress={() => onCoursePress?.(course._id)}
              colors={colors}
              isDark={isDark}
              styles={styles}
            />
          ))
        ) : (
          <EmptyCarouselCard onPress={onBrowse} colors={colors} isDark={isDark} styles={styles} />
        )}
        {topSignal ? (
          <CarouselSignalCard signal={topSignal} onPress={onSignalPress} colors={colors} styles={styles} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: { marginBottom: 28 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    link: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    scroll: {
      gap: 14,
      paddingRight: 20,
    },
    cardPress: {
      width: CARD_W,
    },
    pressed: { opacity: 0.96, transform: [{ scale: 0.985 }] },
    cardInner: {
      padding: 0,
      overflow: 'hidden',
    },
    thumbWrap: {
      height: 118,
      position: 'relative',
      backgroundColor: colors.surfaceHover,
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
    levelPill: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    levelDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    levelText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    progressBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    progressBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
    },
    body: {
      padding: 14,
      gap: 8,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.25,
      lineHeight: 20,
      minHeight: 40,
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
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerHint: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    resumeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signalHero: {
      height: 118,
      padding: 14,
      justifyContent: 'flex-end',
      gap: 2,
      overflow: 'hidden',
    },
    signalTop: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    signalPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    buyPill: { backgroundColor: 'rgba(52,199,89,0.2)' },
    sellPill: { backgroundColor: 'rgba(255,107,107,0.2)' },
    signalPillText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    signalPair: {
      fontSize: 20,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.4,
    },
    signalEntry: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.65)',
      fontVariant: ['tabular-nums'],
    },
    signalLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    emptyHero: {
      height: 118,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: 16,
    },
    emptyHeroTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 4,
    },
    emptyHeroSub: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: 12,
      marginTop: 2,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
