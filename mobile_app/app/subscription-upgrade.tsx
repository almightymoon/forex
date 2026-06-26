import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { lightColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../components/AuthInput';
import { GradientButton } from '../components/GradientButton';
import { GlassCard } from '../components/GlassCard';
import { PaymentScreenshotPicker, ScreenshotAsset } from '../components/PaymentScreenshotPicker';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch, apiUpload } from '../utils/api';
import { getStoredUser } from '../utils/auth';
import { hapticSuccess } from '../utils/haptics';

const WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';

const ACCENTS: Record<number, { top: [string, string]; glow: string }> = {
  0: { top: ['#00C97B', '#00875A'], glow: '#00C97B' },
  1: { top: [lightColors.brandBlueDeep, lightColors.brandBlueDeep], glow: lightColors.brandBlueDeep },
  2: { top: [lightColors.brandPurple, lightColors.brandPurpleDeep], glow: lightColors.brandPurple },
};
const fallbackAccent = {
  top: [lightColors.brandBlueDeep, lightColors.brandBlueDeep] as [string, string],
  glow: lightColors.brandBlueDeep,
};

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

interface Package {
  _id?: string;
  name: string;
  price: number;
  currency?: string;
  subtitle?: string;
  features?: string[];
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
    currency: 'USDT',
    badge: 'Starter',
    sortOrder: 0,
    features: ['Forex Trading Signals', 'Forex Basic Mentorship', 'Premium Indicators'],
  },
  {
    name: 'FX Scale',
    subtitle: 'Grow with structure',
    price: 600,
    currency: 'USDT',
    badge: 'Most Popular',
    highlight: true,
    sortOrder: 1,
    features: ['Forex Trading Signals', 'Live Online Mentorship', 'Premium Indicators'],
  },
  {
    name: 'FX Legacy',
    subtitle: 'Trade for life',
    price: 1000,
    currency: 'USDT',
    badge: 'Elite Program',
    sortOrder: 2,
    features: ['Forex Pro Mentorship', 'Premium Indicators', 'Physical Classes'],
  },
];

function getAccent(idx: number) {
  return ACCENTS[idx % 3] ?? fallbackAccent;
}

type PackageCardProps = {
  pkg: Package;
  idx: number;
  isSelected: boolean;
  isCurrent: boolean;
  colors: AppColors;
  isDark: boolean;
  onSelect: () => void;
};

function UpgradePackageCard({
  pkg,
  idx,
  isSelected,
  isCurrent,
  colors,
  isDark,
  onSelect,
}: PackageCardProps) {
  const styles = useMemo(() => createCardStyles(colors, isDark), [colors, isDark]);
  const ac = getAccent(idx);
  const features = pkg.features?.length
    ? pkg.features.slice(0, 3)
    : ['Full platform access', 'Priority support', 'All premium features'];

  return (
    <Pressable
      onPress={onSelect}
      disabled={isCurrent}
      style={({ pressed }) => [
        styles.pkgWrap,
        isSelected && styles.pkgWrapSelected,
        isCurrent && styles.pkgWrapCurrent,
        pressed && !isCurrent && styles.pkgPressed,
      ]}
    >
      <GlassCard contentStyle={styles.pkgCardInner} radius={20}>
        <LinearGradient
          colors={ac.top}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pkgStripe}
        />
        <View style={styles.pkgHeader}>
          <View style={styles.pkgTitleBlock}>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.primaryForeground} />
                <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
              </View>
            ) : pkg.badge ? (
              <View style={[styles.pkgBadge, { backgroundColor: `${ac.glow}22` }]}>
                <Text style={[styles.pkgBadgeText, { color: ac.glow }]}>
                  {pkg.badge.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={styles.pkgName}>{pkg.name}</Text>
            {pkg.subtitle ? <Text style={styles.pkgSubtitle}>{pkg.subtitle}</Text> : null}
          </View>
          <View style={styles.pkgPriceBlock}>
            <Text style={styles.pkgPrice}>${pkg.price}</Text>
            <Text style={styles.pkgCurrency}>{pkg.currency ?? 'USDT'}</Text>
          </View>
        </View>

        <View style={styles.pkgFeatures}>
          {features.map((f, featIdx) => (
            <View key={`${pkg.name}-f-${featIdx}`} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={15} color={ac.glow} />
              <Text style={styles.featureText} numberOfLines={1}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.pkgFooter}>
          <View
            style={[
              styles.radio,
              isSelected && styles.radioSelected,
              isSelected && { borderColor: colors.primary },
              isCurrent && styles.radioCurrent,
            ]}
          >
            {isSelected ? (
              <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
            ) : isCurrent ? (
              <Ionicons name="checkmark" size={12} color={colors.textMuted} />
            ) : null}
          </View>
          <Text style={styles.pkgFooterText}>
            {isCurrent
              ? 'Your active plan'
              : isSelected
                ? 'Selected for upgrade'
                : 'Tap to select'}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function createCardStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    pkgWrap: {
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    pkgWrapSelected: {
      borderColor: colors.primary,
    },
    pkgWrapCurrent: {
      opacity: 0.88,
    },
    pkgPressed: { opacity: 0.94 },
    pkgCardInner: { padding: 0, overflow: 'hidden' },
    pkgStripe: { height: 4, width: '100%' },
    pkgHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      gap: 12,
    },
    pkgTitleBlock: { flex: 1, gap: 4 },
    currentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary,
      marginBottom: 2,
    },
    currentBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: colors.primaryForeground,
    },
    pkgBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 2,
    },
    pkgBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    pkgName: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    pkgSubtitle: { fontSize: 12.5, color: colors.textMuted, fontWeight: '500' },
    pkgPriceBlock: { alignItems: 'flex-end' },
    pkgPrice: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    pkgCurrency: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 1 },
    pkgFeatures: { paddingHorizontal: 16, paddingBottom: 12, gap: 7 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureText: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    pkgFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceHover,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(0,0,0,0.04)' },
    radioCurrent: { borderColor: colors.border, backgroundColor: colors.surfaceInset },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    pkgFooterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  });
}

function StepPill({ step, label, colors }: { step: number; label: string; colors: AppColors }) {
  const styles = useMemo(() => createStepStyles(colors), [colors]);
  return (
    <View style={styles.stepPill}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{step}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

function createStepStyles(colors: AppColors) {
  return StyleSheet.create({
    stepPill: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepNum: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { fontSize: 12, fontWeight: '800', color: colors.primaryForeground },
    stepLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  });
}

export default function SubscriptionUpgradeScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const params = useLocalSearchParams<{ packageName?: string; amount?: string }>();
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPkg, setCurrentPkg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [txId, setTxId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getStoredUser();
        if (user?.email) setPayerEmail(user.email);

        const [pkgRes, payRes] = await Promise.all([
          apiFetch('api/packages'),
          apiFetch('api/payments/user'),
        ]);

        let currentName: string | null = null;
        if (payRes.ok) {
          const raw = await payRes.json();
          const payments = Array.isArray(raw) ? raw : raw.data ?? raw.payments ?? [];
          const active = payments.find(
            (p: { type?: string; status: string }) =>
              (!p.type || p.type === 'package') && p.status === 'completed',
          );
          if (active?.package?.name) {
            currentName = active.package.name;
            setCurrentPkg(currentName);
          }
        }

        let activePackages = FALLBACK_PACKAGES;
        if (pkgRes.ok) {
          const all: Package[] = await pkgRes.json();
          if (Array.isArray(all) && all.length > 0) {
            activePackages = all
              .filter((p) => p.isActive !== false)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          }
        }

        setPackages(activePackages);

        const preselectFromParams = params.packageName
          ? activePackages.find((p) => p.name === params.packageName)
          : undefined;
        const firstUpgrade = activePackages.find((p) => p.name !== currentName);
        const initial = preselectFromParams?.name !== currentName
          ? preselectFromParams
          : firstUpgrade ?? null;
        if (initial) setSelected(initial);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [params.packageName]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(WALLET_ADDRESS);
    setCopied(true);
    toast('Wallet address copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError('Select a package to upgrade to.');
      return;
    }
    if (selected.name === currentPkg) {
      setError('You are already on this plan. Choose a different tier to upgrade.');
      return;
    }
    if (!txId.trim() || txId.trim().length < 10) {
      setError('Transaction ID is required (min 10 characters).');
      return;
    }
    if (!payerName.trim()) {
      setError('Payer name is required.');
      return;
    }
    if (!payerEmail.trim()) {
      setError('Payer email is required.');
      return;
    }
    if (!screenshot) {
      setError('Payment screenshot is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('targetPackageName', selected.name);
      form.append('transactionId', txId.trim());
      form.append('payerName', payerName.trim());
      form.append('payerEmail', payerEmail.trim());
      form.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.name,
        type: screenshot.type,
      } as unknown as Blob);

      const res = await apiUpload('api/payments/submit-package-upgrade', form);
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        router.replace('/payment-pending');
      } else {
        const errs = (d as { errors?: Array<{ msg: string }> }).errors;
        setError(
          errs?.[0]?.msg ??
            (d as { message?: string; error?: string }).message ??
            (d as { error?: string }).error ??
            'Submission failed.',
        );
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground variant="auth">
        <SafeAreaView style={styles.safe}>
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading upgrade options…</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.topBar}>
              <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.topBarCenter}>
                <Text style={styles.topBarTitle}>Upgrade Package</Text>
                <Text style={styles.topBarSub}>Unlock more with a higher tier</Text>
              </View>
              <View style={styles.backBtn} />
            </View>

            {/* Hero */}
            <LinearGradient
              colors={colors.headerGradient as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroIconWrap}>
                <Ionicons name="rocket-outline" size={28} color={colors.brandPurple} />
              </View>
              <Text style={styles.heroTitle}>Level up your access</Text>
              <Text style={styles.heroSub}>
                Choose a higher tier, send USDT (TRC20), and submit proof for admin review.
              </Text>
              {currentPkg ? (
                <View style={styles.currentPill}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.brandPurple} />
                  <Text style={styles.currentPillText}>Current plan · {currentPkg}</Text>
                </View>
              ) : null}
            </LinearGradient>

            {packages.length === 0 ? (
              <GlassCard contentStyle={styles.emptyCard} radius={22}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cube-outline" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No packages available</Text>
                <Text style={styles.emptyText}>
                  We could not load packages right now. Please try again later or contact support.
                </Text>
                <Pressable style={styles.emptyBtn} onPress={() => router.back()}>
                  <Text style={styles.emptyBtnText}>Go back</Text>
                </Pressable>
              </GlassCard>
            ) : (
              <>
                {/* Package selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionEyebrow}>STEP 1</Text>
                  <Text style={styles.sectionTitle}>Choose a package</Text>
                  <View style={styles.pkgList}>
                    {packages.map((pkg, idx) => (
                      <UpgradePackageCard
                        key={pkg._id ?? `${pkg.name}-${idx}`}
                        pkg={pkg}
                        idx={idx}
                        isSelected={selected?.name === pkg.name}
                        isCurrent={pkg.name === currentPkg}
                        colors={colors}
                        isDark={isDark}
                        onSelect={() => {
                          setSelected(pkg);
                          setError('');
                        }}
                      />
                    ))}
                  </View>
                </View>

                {/* Order summary */}
                {selected ? (
                  <GlassCard contentStyle={styles.summaryCard} radius={18}>
                    <View style={styles.summaryHeader}>
                      <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                      <Text style={styles.summaryTitle}>Upgrade summary</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>From</Text>
                      <Text style={styles.summaryValue}>{currentPkg ?? 'Current plan'}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>To</Text>
                      <Text style={[styles.summaryValue, styles.summaryHighlight]}>{selected.name}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Amount due</Text>
                      <Text style={styles.summaryAmount}>${selected.price} USDT</Text>
                    </View>
                  </GlassCard>
                ) : null}

                {/* Payment proof */}
                <View style={styles.section}>
                  <Text style={styles.sectionEyebrow}>STEP 2</Text>
                  <Text style={styles.sectionTitle}>Send payment & submit proof</Text>

                  <View style={styles.stepsRow}>
                    <StepPill step={1} label="Copy wallet" colors={colors} />
                    <StepPill step={2} label="Send USDT" colors={colors} />
                    <StepPill step={3} label="Submit proof" colors={colors} />
                  </View>

                  <GlassCard contentStyle={styles.walletCard} radius={16}>
                    <View style={styles.walletHeader}>
                      <View style={styles.walletIcon}>
                        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.walletCopy}>
                        <Text style={styles.walletLabel}>USDT (TRC20) wallet</Text>
                        <Text style={styles.walletHint}>Send the exact upgrade amount to this address</Text>
                      </View>
                    </View>
                    <Pressable style={styles.walletRow} onPress={handleCopy}>
                      <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                        {WALLET_ADDRESS}
                      </Text>
                      <View style={[styles.copyBtn, copied && styles.copyBtnDone]}>
                        <Ionicons
                          name={copied ? 'checkmark' : 'copy-outline'}
                          size={16}
                          color={copied ? colors.success : colors.primaryForeground}
                        />
                      </View>
                    </Pressable>
                  </GlassCard>

                  <GlassCard contentStyle={styles.formCard} radius={18}>
                    <AuthInput
                      label="Transaction ID / Hash"
                      icon="receipt-outline"
                      placeholder="Paste transaction ID"
                      value={txId}
                      onChangeText={(v) => {
                        setTxId(v);
                        setError('');
                      }}
                      autoCapitalize="none"
                    />
                    <AuthInput
                      label="Payer Name"
                      icon="person-outline"
                      placeholder="Name on exchange"
                      value={payerName}
                      onChangeText={(v) => {
                        setPayerName(v);
                        setError('');
                      }}
                      autoCapitalize="words"
                    />
                    <AuthInput
                      label="Payer Email"
                      icon="mail-outline"
                      placeholder="your@email.com"
                      value={payerEmail}
                      onChangeText={(v) => {
                        setPayerEmail(v);
                        setError('');
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <PaymentScreenshotPicker
                      value={screenshot}
                      onChange={setScreenshot}
                      error={error.includes('screenshot') ? error : undefined}
                    />
                  </GlassCard>

                  {error && !error.includes('screenshot') ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <GradientButton
                    title={selected ? `Submit · ${selected.name}` : 'Submit Upgrade Payment'}
                    loading={submitting}
                    onPress={handleSubmit}
                  />

                  <View style={styles.notice}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.noticeText}>
                      Upgrades are reviewed within 24 hours. Use TRC20 only — other networks may not be credited.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 44, gap: 20 },
    loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 80 },
    loaderText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 4,
      marginBottom: 4,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarCenter: { flex: 1, alignItems: 'center', gap: 2 },
    topBarTitle: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    topBarSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

    hero: {
      borderRadius: 22,
      padding: 22,
      gap: 10,
      overflow: 'hidden',
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textOnDark,
      letterSpacing: -0.4,
    },
    heroSub: {
      fontSize: 13.5,
      color: 'rgba(255,255,255,0.68)',
      lineHeight: 20,
      fontWeight: '500',
    },
    currentPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(167,139,250,0.35)',
    },
    currentPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textOnDark,
    },

    section: { gap: 12 },
    sectionEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      marginTop: -6,
    },
    stepsRow: { gap: 12, marginBottom: 4 },

    pkgList: { gap: 12 },

    summaryCard: { padding: 16, gap: 10 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    summaryHighlight: { color: colors.primary, fontWeight: '800' },
    summaryAmount: { fontSize: 18, fontWeight: '900', color: colors.primary, letterSpacing: -0.3 },
    summaryDivider: { height: 1, backgroundColor: colors.border },

    walletCard: { padding: 14, gap: 12 },
    walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    walletIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
    },
    walletCopy: { flex: 1, gap: 2 },
    walletLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    walletHint: { fontSize: 12, color: colors.textMuted },
    walletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceInset,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderBlue,
      padding: 12,
    },
    walletAddress: {
      flex: 1,
      fontSize: 13,
      color: colors.blue,
      fontWeight: '600',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    copyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBtnDone: { backgroundColor: isDark ? 'rgba(48,209,88,0.2)' : 'rgba(52,199,89,0.15)' },

    formCard: { padding: 16, gap: 4 },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : 'rgba(255,90,90,0.1)',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,69,58,0.25)' : 'rgba(255,90,90,0.2)',
    },
    errorText: { flex: 1, fontSize: 13, color: colors.error, fontWeight: '500' },

    notice: { flexDirection: 'row', gap: 8, paddingHorizontal: 2, marginTop: 4 },
    noticeText: { flex: 1, fontSize: 12, color: colors.textDim, lineHeight: 18 },

    emptyCard: { alignItems: 'center', padding: 32, gap: 12 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 280,
    },
    emptyBtn: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  });
}
