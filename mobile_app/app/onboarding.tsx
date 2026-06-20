import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { SwingingIllustration } from '../components/onboarding/SwingingIllustration';
import { SpaceBackground } from '../components/SpaceBackground';
import { spacing } from '../constants/theme';
import { markOnboardingComplete } from '../utils/onboarding';

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === '1' || preview === 'true';
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;

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

  const ctaLabel = isLast
    ? isPreview
      ? 'Back to Sign In'
      : slide.cta
    : slide.cta;

  return (
    <View style={styles.screen}>
      <SpaceBackground />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {isPreview ? (
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={goToAuth} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backText}>Sign In</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          style={styles.list}
          data={ONBOARDING_SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item, index: slideIndex }) => (
            <View style={[styles.page, { width }]}>
              <View style={styles.copyBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>

              <View style={styles.heroWrap}>
                <SwingingIllustration
                  source={item.illustration}
                  style={styles.hero}
                  phaseMs={slideIndex * 350}
                />
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <OnboardingPagination count={ONBOARDING_SLIDES.length} activeIndex={index} />
          <PrimaryButton title={ctaLabel} onPress={onNext} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
  },
  copyBlock: {
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    maxWidth: 340,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  hero: {
    width: '98%',
    height: '88%',
    maxHeight: 440,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
});
