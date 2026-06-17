import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using The FX Navigators platform and mobile app, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.',
  },
  {
    title: '2. Educational Services',
    body: 'Our courses, signals, and mentorship are provided for educational purposes only. We do not provide financial advice, and past performance is not indicative of future results. Trading forex carries substantial risk of loss.',
  },
  {
    title: '3. Account & Payments',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. Package payments are processed via USDT (TRC20) and reviewed manually. Access is granted upon admin approval. Monthly fees apply per your package tier.',
  },
  {
    title: '4. Acceptable Use',
    body: 'You agree not to share account access, redistribute course content, harass community members, or use the platform for unlawful purposes. We reserve the right to suspend accounts that violate these rules.',
  },
  {
    title: '5. Referrals & Rewards',
    body: 'Referral commissions and rank rewards are subject to program rules displayed in the app. Fraudulent referrals or self-referrals may result in forfeiture of rewards and account suspension.',
  },
  {
    title: '6. Intellectual Property',
    body: 'All course materials, signals, branding, and platform content are owned by The FX Navigators. You may not copy, distribute, or commercially exploit any content without written permission.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'We are not liable for trading losses, technical interruptions, or third-party service failures. Our total liability is limited to the amount you paid for services in the preceding 12 months.',
  },
  {
    title: '8. Changes & Contact',
    body: 'We may update these terms at any time. Continued use constitutes acceptance. Questions: thefxnavigators@gmail.com',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.updated}>
          <Ionicons name="document-text-outline" size={16} color="#3AADFF" />
          <Text style={styles.updatedText}>Last updated: June 2025</Text>
        </View>

        <Text style={styles.intro}>
          Please read these terms carefully before using The FX Navigators platform.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  updated: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updatedText: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)' },
  intro: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 21 },
  section: { backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sectionBody: { fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 21 },
});
