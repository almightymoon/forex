import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { MenuStackHeader } from '../../components/navigation/MenuStackHeader';
import { DisclaimerBlock } from '../../components/DisclaimerBlock';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using The FX Navigators platform and mobile app, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.',
  },
  {
    title: 'Educational Services',
    body: 'Our courses, signals, and mentorship are provided for educational purposes only. We do not provide financial advice, and past performance is not indicative of future results. Trading forex carries substantial risk of loss.',
  },
  {
    title: 'Account & Payments',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. Package payments are processed via USDT (TRC20) and reviewed manually. Access is granted upon admin approval. Monthly fees apply per your package tier.',
  },
  {
    title: 'Acceptable Use',
    body: 'You agree not to share account access, redistribute course content, harass community members, or use the platform for unlawful purposes. We reserve the right to suspend accounts that violate these rules.',
  },
  {
    title: 'Referrals & Rewards',
    body: 'Referral commissions and rank rewards are subject to program rules displayed in the app. Fraudulent referrals or self-referrals may result in forfeiture of rewards and account suspension.',
  },
  {
    title: 'Intellectual Property',
    body: 'All course materials, signals, branding, and platform content are owned by The FX Navigators. You may not copy, distribute, or commercially exploit any content without written permission.',
  },
  {
    title: 'Limitation of Liability',
    body: 'We are not liable for trading losses, technical interruptions, or third-party service failures. Our total liability is limited to the amount you paid for services in the preceding 12 months.',
  },
  {
    title: 'Changes & Contact',
    body: 'We may update these terms at any time. Continued use constitutes acceptance. Questions: thefxnavigators@gmail.com',
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="Terms of Service" subtitle="Legal agreement" onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={28} color={colors.black} />
          </View>
          <Text style={styles.heroTitle}>Terms of Service</Text>
          <View style={styles.updatedRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.updatedText}>Last updated June 2025</Text>
          </View>
          <Text style={styles.intro}>
            Please read these terms carefully before using The FX Navigators platform.
          </Text>
        </View>

        <DisclaimerBlock style={styles.disclaimer} />

        {SECTIONS.map((s, idx) => (
          <GlassListCard key={s.title} contentStyle={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNum}>
                <Text style={styles.sectionNumText}>{idx + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </GlassListCard>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  hero: {
    borderRadius: 22,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updatedText: { fontSize: 12.5, color: colors.textMuted, fontWeight: '500' },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, textAlign: 'center' },
  disclaimer: { marginBottom: 4 },
  section: { padding: 18, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionNumText: { fontSize: 13, fontWeight: '800', color: colors.black },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  sectionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, paddingLeft: 40 },
});
}
