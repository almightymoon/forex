import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '../components/onboarding/onboardingContent';
import { OnboardingPagination } from '../components/onboarding/OnboardingPagination';
import { OnboardingSlideVisual } from '../components/onboarding/OnboardingSlideVisual';
import { OnboardingWordmark } from '../components/onboarding/OnboardingWordmark';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { markOnboardingComplete } from '../utils/onboarding';

function stepLabel(index: number, total: number) {
  const cur = String(index + 1).padStart(2, '0');
  const max = String(total).padStart(2, '0');
  return `${cur} / ${max}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === '1' || preview === 'true';
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const total = ONBOARDING_SLIDES.length;

  const goToAuth = () => {
    router.replace('/auth');
  };

  const finish = async () => {
    if (!isPreview) {
      await markOnboardingComplete();
    }
    goToAuth();
  };

  const onNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const ctaLabel = isLast ? (isPreview ? 'Back to sign in' : slide.cta) : slide.cta;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={
          isDark
            ? (['#0B0B0D', '#141416', colors.background] as [string, string, ...string[]])
            : (['#F4F4F5', '#F4F4F5', colors.background] as [string, string, ...string[]])
        }
        style={StyleSheet.absoluteFill}
      />
      {!isDark ? <View style={styles.lightOrb} pointerEvents="none" /> : null}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {isPreview ? (
            <Pressable style={styles.backBtn} onPress={goToAuth} hitSlop={12}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={styles.backText}>Sign in</Text>
            </Pressable>
          ) : (
            <OnboardingWordmark compact />
          )}

          {!isPreview && !isLast ? (
            <Pressable onPress={finish} hitSlop={12} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={ONBOARDING_SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              <View style={styles.visualStage}>
                <OnboardingSlideVisual variant={item.visual} />
              </View>
            </View>
          )}
        />

        <View style={styles.sheet}>
          <Text style={styles.stepCounter}>{stepLabel(index, total)}</Text>
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>{slide.eyebrow}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <OnboardingPagination count={total} activeIndex={index} />
          <PrimaryButton title={ctaLabel} onPress={onNext} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    lightOrb: {
      position: 'absolute',
      top: -60,
      left: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(167,139,250,0.18)',
    },
    safe: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 8,
      minHeight: 44,
      zIndex: 2,
    },
    headerSpacer: {
      width: 48,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
    },
    backText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    skipBtn: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    skipText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
    },
    list: {
      flex: 1,
    },
    page: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
      paddingBottom: 12,
    },
    visualStage: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    sheet: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 8,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: isDark ? colors.surface : colors.surface,
      borderTopWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 16,
      elevation: 12,
    },
    stepCounter: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textDim,
      letterSpacing: 1.4,
      marginBottom: 12,
    },
    eyebrowPill: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(167,139,250,0.14)' : 'rgba(167,139,250,0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginBottom: 10,
    },
    eyebrowText: {
      fontSize: 10,
      fontWeight: '800',
      color: isDark ? colors.brandPurple : colors.text,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.6,
      lineHeight: 34,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 4,
    },
  });
}
