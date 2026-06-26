import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { MenuStackHeader } from '../../components/navigation/MenuStackHeader';

const STATS = [
  { num: '9+', label: 'Years experience' },
  { num: '100+', label: 'Students mentored' },
  { num: '85%', label: 'Success rate' },
  { num: '24/7', label: 'Community access' },
];

const SERVICES = [
  { icon: 'book-outline' as const, title: 'Forex trading courses', desc: 'Structured curriculum from fundamentals through advanced execution.' },
  { icon: 'pulse-outline' as const, title: 'Live mentorship', desc: 'Live sessions with experienced traders and real market analysis.' },
  { icon: 'trending-up-outline' as const, title: 'Trading signals', desc: 'Curated signals with risk management guidance.' },
  { icon: 'people-outline' as const, title: 'Community', desc: 'Connect with traders, share insights, and grow together.' },
];

const CONTACT_ROWS = [
  { icon: 'mail-outline' as const, label: 'Email', value: 'thefxnavigators@gmail.com', onPress: () => Linking.openURL('mailto:thefxnavigators@gmail.com') },
  { icon: 'call-outline' as const, label: 'Phone', value: '+92 348 8566147', onPress: () => Linking.openURL('tel:+923488566147') },
  { icon: 'logo-whatsapp' as const, label: 'WhatsApp', value: '+92 348 8566147', onPress: () => Linking.openURL('https://wa.me/923488566147') },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <MenuStackHeader title="About Us" subtitle="Our story & mission" onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>Since 2015</Text>
          </View>
          <Text style={styles.heroTitle}>The FX Navigators</Text>
          <Text style={styles.heroSub}>
            Empowering traders with education, signals, and a supportive community built for serious market participants.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <GlassListCard key={s.label} style={styles.statBoxWrap} contentStyle={styles.statBox}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </GlassListCard>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Our mission</Text>
        <GlassListCard contentStyle={styles.missionCard}>
          <Text style={styles.body}>
            We believe every trader deserves access to quality education and real mentorship. Our platform combines
            structured courses, live sessions, trading signals, and a vibrant community to help you navigate the
            forex markets with confidence and discipline.
          </Text>
        </GlassListCard>

        <Text style={styles.sectionTitle}>What we offer</Text>
        {SERVICES.map((s) => (
          <GlassListCard key={s.title} contentStyle={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Ionicons name={s.icon} size={20} color={colors.text} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              <Text style={styles.serviceDesc}>{s.desc}</Text>
            </View>
          </GlassListCard>
        ))}

        <Text style={styles.sectionTitle}>Get in touch</Text>
        <GlassListCard contentStyle={styles.contactCard}>
          {CONTACT_ROWS.map((row, idx) => (
            <View key={row.label}>
              <Pressable style={styles.contactRow} onPress={row.onPress}>
                <View style={styles.contactIcon}>
                  <Ionicons name={row.icon} size={18} color={colors.text} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>{row.label}</Text>
                  <Text style={styles.contactValue}>{row.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              {idx < CONTACT_ROWS.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
          <Text style={styles.contactSub}>Mon–Sat, 9AM–6PM (PKT)</Text>
        </GlassListCard>

        <Pressable style={styles.supportLink} onPress={() => router.push('/(app)/support')}>
          <Text style={styles.supportLinkText}>Need help? Contact support</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primaryForeground} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  hero: { borderRadius: 22, padding: 24, gap: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 4,
  },
  eyebrowText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBoxWrap: { flex: 1, minWidth: '44%' },
  statBox: { padding: 16, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11.5, color: colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  missionCard: { padding: 18 },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 23 },
  serviceCard: { flexDirection: 'row', gap: 14, padding: 16 },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceInfo: { flex: 1, gap: 4 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  serviceDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  contactCard: { padding: 0, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  contactValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 68 },
  contactSub: { fontSize: 12, color: colors.textDim, paddingHorizontal: 16, paddingBottom: 14 },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  supportLinkText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
});
}
