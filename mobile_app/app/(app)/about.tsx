import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>About Us</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['rgba(0,96,230,0.25)', 'rgba(8,20,48,0.95)']} style={styles.hero}>
          <Text style={styles.heroTitle}>The FX Navigators</Text>
          <Text style={styles.heroSub}>
            Empowering traders with education, signals, and a supportive community since 2015.
          </Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.body}>
          We believe every trader deserves access to quality education and real mentorship. Our platform combines
          structured courses, live sessions, trading signals, and a vibrant community to help you navigate the
          forex markets with confidence and discipline.
        </Text>

        <Text style={styles.sectionTitle}>What We Offer</Text>
        {SERVICES.map((s) => (
          <View key={s.title} style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Ionicons name={s.icon} size={20} color="#3AADFF" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              <Text style={styles.serviceDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactLine}>thefxnavigators@gmail.com</Text>
          <Text style={styles.contactLine}>+92 348 8566147</Text>
          <Text style={styles.contactSub}>Mon–Sat, 9AM–6PM (PKT)</Text>
        </View>
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
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  hero: { borderRadius: 20, padding: 24, gap: 10, borderWidth: 1, borderColor: 'rgba(58,173,255,0.15)' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 21 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: '44%', backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, fontWeight: '900', color: '#3AADFF' },
  statLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  serviceCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14 },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,96,230,0.15)', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1, gap: 4 },
  serviceTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  serviceDesc: { fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 18 },
  contactCard: { backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 6 },
  contactLine: { fontSize: 14, fontWeight: '600', color: '#3AADFF' },
  contactSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
});
