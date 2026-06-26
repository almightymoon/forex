import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { OnboardingVisual } from './onboardingContent';

type Props = {
  variant: OnboardingVisual;
};

export function OnboardingSlideVisual({ variant }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.frame}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F8FA']}
        style={styles.frameGradient}
      >
        <View style={styles.frameGlow} pointerEvents="none" />

        {variant === 'desk' ? <DeskMock styles={styles} colors={colors} /> : null}
        {variant === 'learn' ? <LearnMock styles={styles} colors={colors} /> : null}
        {variant === 'community' ? <CommunityMock styles={styles} colors={colors} /> : null}
      </LinearGradient>
    </View>
  );
}

type MockStyles = ReturnType<typeof createStyles>;

function DeskMock({ styles, colors }: { styles: MockStyles; colors: AppColors }) {
  return (
    <View style={styles.mock}>
      <View style={styles.mockHeader}>
        <View style={styles.liveDot} />
        <Text style={styles.mockEyebrow}>Live signal</Text>
        <View style={styles.mockChip}>
          <Text style={styles.mockChipText}>Active</Text>
        </View>
      </View>
      <View style={styles.signalRow}>
        <View>
          <Text style={styles.pair}>EUR/USD</Text>
          <Text style={styles.pairSub}>London session</Text>
        </View>
        <View style={styles.buyPill}>
          <Text style={styles.buyText}>BUY</Text>
        </View>
      </View>
      <View style={styles.metricGrid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Entry</Text>
          <Text style={styles.metricValue}>1.0842</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Target</Text>
          <Text style={[styles.metricValue, { color: colors.brandPurple }]}>1.0910</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Risk</Text>
          <Text style={styles.metricValue}>1.2%</Text>
        </View>
      </View>
      <View style={styles.mockBar}>
        <View style={[styles.mockBarFill, { width: '72%' }]} />
      </View>
    </View>
  );
}

function LearnMock({ styles, colors }: { styles: MockStyles; colors: AppColors }) {
  return (
    <View style={styles.mock}>
      <View style={styles.mockHeader}>
        <Ionicons name="school-outline" size={16} color={colors.brandPurple} />
        <Text style={styles.mockEyebrow}>Your course</Text>
      </View>
      <View style={styles.courseCard}>
        <LinearGradient colors={[colors.brandBlueDeep, colors.brandBlueDeep]} style={styles.courseThumb} />
        <View style={styles.courseCopy}>
          <Text style={styles.courseTitle}>FX Foundations</Text>
          <Text style={styles.courseSub}>12 lessons · Intermediate</Text>
        </View>
      </View>
      <View style={styles.progressBlock}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPct}>68%</Text>
        </View>
        <View style={styles.mockBar}>
          <View style={[styles.mockBarFill, { width: '68%' }]} />
        </View>
      </View>
      <View style={styles.lessonRow}>
        <Ionicons name="checkmark-circle" size={14} color={colors.brandPurple} />
        <Text style={styles.lessonText}>Risk management basics</Text>
      </View>
      <View style={styles.lessonRow}>
        <Ionicons name="play-circle" size={14} color={colors.textDim} />
        <Text style={[styles.lessonText, styles.lessonTextMuted]}>Next: Chart patterns</Text>
      </View>
    </View>
  );
}

function CommunityMock({ styles, colors }: { styles: MockStyles; colors: AppColors }) {
  return (
    <View style={styles.mock}>
      <View style={styles.mockHeader}>
        <Ionicons name="chatbubbles-outline" size={16} color={colors.brandPurple} />
        <Text style={styles.mockEyebrow}>Desk chat</Text>
        <Text style={styles.onlineText}>24 online</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleOther]}>
        <Text style={styles.bubbleName}>Alex</Text>
        <Text style={styles.bubbleBody}>Great read on GBP/JPY setup today.</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleSelf]}>
        <Text style={[styles.bubbleBody, styles.bubbleBodySelf]}>Taking the London breakout playbook into demo.</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleOther]}>
        <Text style={styles.bubbleName}>Desk mod</Text>
        <Text style={styles.bubbleBody}>Live session starts in 15 min — join #mentorship.</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const ink = '#0F0F0F';
  const inkMuted = '#8E8E93';
  const inkDim = '#AEAEB2';
  const inset = '#F4F4F5';
  const insetBorder = 'rgba(0,0,0,0.06)';

  return StyleSheet.create({
    frame: {
      width: '100%',
      maxWidth: 340,
      aspectRatio: 0.92,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.22 : 0.1,
      shadowRadius: 28,
      elevation: 8,
    },
    frameGradient: {
      flex: 1,
      padding: 18,
      justifyContent: 'center',
    },
    frameGlow: {
      position: 'absolute',
      top: -40,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(167,139,250,0.12)',
    },
    mock: {
      gap: 14,
      zIndex: 1,
    },
    mockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.brandPurple,
    },
    mockEyebrow: {
      flex: 1,
      fontSize: 11,
      fontWeight: '800',
      color: inkMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    mockChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(167,139,250,0.28)',
    },
    mockChipText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.brandPurple,
    },
    signalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pair: {
      fontSize: 22,
      fontWeight: '900',
      color: ink,
      letterSpacing: -0.5,
    },
    pairSub: {
      fontSize: 12,
      fontWeight: '500',
      color: inkMuted,
      marginTop: 2,
    },
    buyPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(52,199,89,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(52,199,89,0.45)',
    },
    buyText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.success,
      letterSpacing: 0.5,
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    metric: {
      flex: 1,
      padding: 10,
      borderRadius: 12,
      backgroundColor: inset,
      borderWidth: 1,
      borderColor: insetBorder,
      gap: 4,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: inkDim,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '800',
      color: ink,
      fontVariant: ['tabular-nums'],
    },
    mockBar: {
      height: 5,
      borderRadius: 3,
      backgroundColor: '#ECECEE',
      overflow: 'hidden',
    },
    mockBarFill: {
      height: '100%',
      backgroundColor: colors.brandPurple,
      borderRadius: 3,
    },
    courseCard: {
      flexDirection: 'row',
      gap: 10,
      padding: 10,
      borderRadius: 14,
      backgroundColor: inset,
      borderWidth: 1,
      borderColor: insetBorder,
    },
    courseThumb: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    courseCopy: {
      flex: 1,
      justifyContent: 'center',
      gap: 3,
    },
    courseTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: ink,
    },
    courseSub: {
      fontSize: 11,
      fontWeight: '500',
      color: inkMuted,
    },
    progressBlock: {
      gap: 6,
    },
    progressTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: inkDim,
    },
    progressPct: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.brandPurple,
    },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    lessonText: {
      fontSize: 12,
      fontWeight: '600',
      color: ink,
      flex: 1,
    },
    lessonTextMuted: {
      color: inkMuted,
    },
    onlineText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.brandPurple,
    },
    bubble: {
      borderRadius: 14,
      padding: 10,
      gap: 3,
      maxWidth: '92%',
    },
    bubbleOther: {
      alignSelf: 'flex-start',
      backgroundColor: inset,
      borderWidth: 1,
      borderColor: insetBorder,
    },
    bubbleSelf: {
      alignSelf: 'flex-end',
      backgroundColor: 'rgba(167,139,250,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(167,139,250,0.24)',
    },
    bubbleName: {
      fontSize: 10,
      fontWeight: '700',
      color: inkDim,
    },
    bubbleBody: {
      fontSize: 12,
      fontWeight: '500',
      color: ink,
      lineHeight: 17,
    },
    bubbleBodySelf: {
      color: ink,
    },
  });
}
