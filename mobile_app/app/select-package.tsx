import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch } from '../utils/api';

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
    features: ['Forex Trading Signals', 'Forex Basic Mentorship', 'Premium Indicators', 'Auto Trading Access'],
  },
  {
    name: 'FX Scale',
    subtitle: 'Grow with structure',
    price: 600,
    currency: 'USD',
    badge: 'Most Popular',
    highlight: true,
    features: ['Forex Trading Signals', 'Live Online Mentorship Sessions', 'Premium Indicators', 'Auto Trading Access'],
  },
  {
    name: 'FX Legacy',
    subtitle: 'Trade for life',
    price: 1000,
    currency: 'USD',
    badge: 'Elite Program',
    features: ['Forex Trading Signals', 'Forex Pro Mentorship', 'Premium Indicators', 'Auto Trading Access', 'Physical (On-Ground) Classes'],
  },
];

export default function SelectPackageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Package | null>(null);
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
      .catch(() => {/* keep fallback */})
      .finally(() => setFetchLoading(false));
  }, []);

  const handleSelect = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      router.push({
        pathname: '/payment',
        params: { packageId: selected._id ?? selected.name, packageName: selected.name, amount: selected.price },
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>Select the package that fits your trading journey</Text>
        </View>

        {fetchLoading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 40 }} />
        ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {packages.map((pkg, idx) => {
            const isSelected = selected?.name === pkg.name;
            return (
              <Pressable key={pkg._id ?? pkg.name ?? idx} onPress={() => setSelected(pkg)} style={styles.cardWrapper}>
                {pkg.badge && (
                  <View style={[styles.popularBadge, pkg.highlight && styles.popularBadgeHighlight]}>
                    <Text style={styles.popularText}>{pkg.badge}</Text>
                  </View>
                )}
                <LinearGradient
                  colors={isSelected ? ['rgba(0,96,230,0.35)', 'rgba(58,173,255,0.15)'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.04)']}
                  style={[styles.card, isSelected && styles.cardSelected, pkg.badge && styles.cardPopular]}
                >
                  {/* Selected indicator */}
                  <View style={styles.cardRow}>
                    <View>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      {pkg.subtitle ? <Text style={styles.packageSubtitle}>{pkg.subtitle}</Text> : null}
                      <View style={styles.priceRow}>
                        <Text style={styles.price}>{pkg.price}</Text>
                        <Text style={styles.currency}> {pkg.currency ?? 'USD'} · USDT</Text>
                      </View>
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {pkg.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={isSelected ? '#3AADFF' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.featureText, isSelected && styles.featureTextActive]}>{f}</Text>
                    </View>
                  ))}
                </LinearGradient>
              </Pressable>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            style={[styles.ctaBtn, !selected && styles.ctaDisabled]}
            onPress={handleSelect}
            disabled={!selected || loading}
          >
            <LinearGradient
              colors={selected ? ['#0253BD', '#036FFC'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.ctaText, !selected && styles.ctaTextDisabled]}>
                  {selected ? `Continue with ${selected.name}` : 'Select a Plan'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.48)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 14,
  },
  cardWrapper: {
    position: 'relative',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 18,
  },
  cardSelected: {
    borderColor: '#3AADFF',
    borderWidth: 1.5,
  },
  cardPopular: {
    marginTop: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    left: 18,
    zIndex: 1,
    backgroundColor: 'rgba(0,96,230,0.85)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularBadgeHighlight: {
    backgroundColor: '#036FFC',
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  packageSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  currency: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#3AADFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3AADFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.45)',
    flex: 1,
  },
  featureTextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  error: {
    textAlign: 'center',
    color: '#FF5A5A',
    fontSize: 13,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 8,
  },
  ctaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ctaTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
});
