import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch } from '../utils/api';
import { primaryButtonGradient } from '../utils/primaryButton';

interface Package {
  _id?: string;
  name: string;
  price: number;
  currency?: string;
  subtitle?: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

const FALLBACK_PACKAGES: Package[] = [
  {
    name: 'FX Launch',
    subtitle: 'Launch your trading journey',
    price: 100,
    currency: 'USD',
    badge: 'Starter',
    features: [
      'Forex Trading Signals',
      'Forex Basic Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
    ],
  },
  {
    name: 'FX Scale',
    subtitle: 'Grow with structure',
    price: 600,
    currency: 'USD',
    badge: 'Most Popular',
    highlight: true,
    features: [
      'Forex Trading Signals',
      'Live Online Mentorship Sessions',
      'Premium Indicators',
      'Auto Trading Access',
    ],
  },
  {
    name: 'FX Legacy',
    subtitle: 'Trade for life',
    price: 1000,
    currency: 'USD',
    badge: 'Elite Program',
    features: [
      'Forex Trading Signals',
      'Forex Pro Mentorship',
      'Premium Indicators',
      'Auto Trading Access',
      'Physical (On-Ground) Classes',
    ],
  },
];

// Per-plan accent palette
const ACCENTS: Record<number, { top: [string, string]; glow: string; dot: string }> = {
  0: { top: ['#00C97B', '#00875A'], glow: '#00C97B', dot: '#00C97B' },
  1: { top: ['#0253BD', '#0253BD'], glow: '#0253BD', dot: '#0253BD' },
  2: { top: ['#A78BFA', '#7C3AED'], glow: '#A78BFA', dot: '#A78BFA' },
};
const fallbackAccent = { top: ['#0253BD', '#0253BD'] as [string, string], glow: '#0253BD', dot: '#0253BD' };

const { width: SW, height: SH } = Dimensions.get('window');

export default function SelectPackageScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<Package | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [packages, setPackages] = useState<Package[]>(FALLBACK_PACKAGES);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('api/packages')
      .then((r) => r.json())
      .then((data: Package[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data
            .filter((p) => p.isActive !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          if (active.length > 0) setPackages(active);
        }
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, []);

  const defaultIndex = useMemo(() => {
    const idx = packages.findIndex((p) => p.highlight);
    return idx >= 0 ? idx : 0;
  }, [packages]);

  useEffect(() => {
    if (fetchLoading || packages.length === 0) return;
    setSelected(packages[defaultIndex]);
    setActiveIndex(defaultIndex);
    if (defaultIndex > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: defaultIndex * SW, animated: false });
      });
    }
  }, [fetchLoading, packages, defaultIndex]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(
      0,
      Math.min(packages.length - 1, Math.round(e.nativeEvent.contentOffset.x / SW)),
    );
    setActiveIndex(idx);
    setSelected(packages[idx]);
  };

  const scrollToIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(packages.length - 1, idx));
    scrollRef.current?.scrollTo({ x: clamped * SW, animated: true });
    setActiveIndex(clamped);
    setSelected(packages[clamped]);
  };

  const handleSelect = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      router.push({
        pathname: '/payment',
        params: {
          packageId: selected._id ?? selected.name,
          packageName: selected.name,
          amount: selected.price,
        },
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const accent = ACCENTS[activeIndex] ?? fallbackAccent;
  const ctaGradientColors = useMemo(
    () => (isDark ? primaryButtonGradient(isDark) : accent.top) as [string, string],
    [isDark, accent.top],
  );

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>Swipe to compare · pay with USDT</Text>
          </View>
          {/* spacer so title is centred */}
          <View style={styles.backBtn} />
        </View>

        {/* ── Dot indicators ─────────────────────────────── */}
        {!fetchLoading && packages.length > 1 ? (
          <View style={styles.dotsRow}>
            {packages.map((_, idx) => (
              <Pressable key={idx} onPress={() => scrollToIndex(idx)}>
                <View
                  style={[
                    styles.dot,
                    activeIndex === idx && {
                      width: 24,
                      backgroundColor: accent.dot,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Cards ──────────────────────────────────────── */}
        {fetchLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.brandBlue} size="large" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {packages.map((pkg, idx) => {
              const ac = ACCENTS[idx] ?? fallbackAccent;
              const isPopular = pkg.highlight || pkg.badge === 'Most Popular';
              return (
                <View key={pkg._id ?? pkg.name ?? idx} style={styles.page}>
                  <View style={styles.card}>
                    {/* Gradient top stripe */}
                    <LinearGradient
                      colors={ac.top}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardTop}
                    >
                      {isPopular ? (
                        <View style={styles.popularRibbon}>
                          <Ionicons name="star" size={11} color="#fff" />
                          <Text style={styles.popularText}>MOST POPULAR</Text>
                        </View>
                      ) : pkg.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{pkg.badge.toUpperCase()}</Text>
                        </View>
                      ) : null}

                      <Text style={styles.planName}>{pkg.name}</Text>
                      {pkg.subtitle ? (
                        <Text style={styles.planSubtitle}>{pkg.subtitle}</Text>
                      ) : null}

                      {/* Price */}
                      <View style={styles.priceRow}>
                        <Text style={styles.priceDollar}>$</Text>
                        <Text style={styles.priceNum}>{pkg.price}</Text>
                      </View>
                      <Text style={styles.priceSub}>{pkg.currency ?? 'USD'} · Paid via USDT (TRC20)</Text>
                    </LinearGradient>

                    {/* Features */}
                    <View style={styles.featuresWrap}>
                      <Text style={styles.featuresLabel}>WHAT'S INCLUDED</Text>
                      <View style={styles.featuresList}>
                        {pkg.features.map((f, i) => (
                          <View key={i} style={styles.featureRow}>
                            <LinearGradient
                              colors={ac.top}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.checkCircle}
                            >
                              <Ionicons name="checkmark" size={13} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.featureText}>{f}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.trustRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.trustText}>Admin-reviewed · Secure checkout</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ── CTA ────────────────────────────────────────── */}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.footer}>
          <Pressable
            style={[styles.ctaBtn, (!selected || loading) && styles.ctaDisabled]}
            onPress={handleSelect}
            disabled={!selected || loading}
          >
            <LinearGradient
              colors={ctaGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {selected ? `Get ${selected.name}` : 'Select a Plan'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const CARD_H = SH * 0.68;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1 },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* dots */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceHover,
  },

  /* scroll */
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'flex-start' },

  /* page = one full-width slot */
  page: {
    width: SW,
    paddingHorizontal: 20,
  },

  /* card */
  card: {
    width: '100%',
    height: CARD_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },

  /* gradient top section */
  cardTop: {
    paddingTop: 28,
    paddingHorizontal: 26,
    paddingBottom: 28,
  },
  popularRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.6,
  },
  planName: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  planSubtitle: {
    fontSize: 14,
    color: colors.textSilver,
    marginTop: 4,
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  priceDollar: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginRight: 2,
  },
  priceNum: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -3,
    lineHeight: 78,
  },
  priceSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },

  /* features */
  featuresWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
  },
  featuresLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textDim,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  featuresList: {
    gap: 12,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: 14.5,
    color: colors.textSilver,
    fontWeight: '500',
    lineHeight: 20,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  trustText: {
    fontSize: 11.5,
    color: colors.textDim,
    fontWeight: '500',
  },

  /* footer */
  error: {
    textAlign: 'center',
    color: '#FF5A5A',
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 14,
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaDisabled: { opacity: 0.55 },
  ctaGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryForeground,
    letterSpacing: -0.2,
  },
});
}
