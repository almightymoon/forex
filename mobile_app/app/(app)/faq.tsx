import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';

interface FaqItem { question: string; answer: string; }
interface FaqCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FaqItem[];
}

const FAQS: FaqCategory[] = [
  {
    id: 'getting-started', title: 'Getting Started',
    icon: 'rocket-outline', color: '#3AADFF',
    items: [
      { question: 'How do I create an account?', answer: 'Click "Get started" on the homepage, complete registration, verify your email, and you\'re ready to access the platform.' },
      { question: 'Is there a free trial available?', answer: 'We offer introductory access for new users. Check current packages on the homepage for what\'s included at signup.' },
      { question: 'What do I need to get started?', answer: 'A computer or mobile device with internet access is enough. No prior trading experience is required — we start from fundamentals.' },
      { question: 'Can I access courses on mobile?', answer: 'Yes. The platform is fully responsive on phones and tablets, so you can learn and follow sessions from anywhere.' },
    ],
  },
  {
    id: 'courses', title: 'Courses & Learning',
    icon: 'book-outline', color: '#A78BFA',
    items: [
      { question: 'What types of courses do you offer?', answer: 'Courses cover forex basics, technical and fundamental analysis, risk management, and advanced execution frameworks.' },
      { question: 'How long do I have access to courses?', answer: 'Enrolled students retain access to their course materials for the duration of their active membership or package term.' },
      { question: 'Are there prerequisites?', answer: 'Beginner tracks require no prior knowledge. Advanced modules list prerequisites clearly in each course description.' },
      { question: 'Can I get a certificate after completing a course?', answer: 'Yes. Certificates are issued when you meet the completion requirements defined for that course or program.' },
      { question: 'How do I track my progress?', answer: 'Your dashboard tracks lesson completion, quizzes, and assignments automatically as you move through each course.' },
    ],
  },
  {
    id: 'signals', title: 'Trading Signals',
    icon: 'trending-up-outline', color: '#4ADE80',
    items: [
      { question: 'What are trading signals?', answer: 'Signals are educational trade setups with entry, stop-loss, and take-profit levels plus the reasoning behind each idea.' },
      { question: 'How accurate are the signals?', answer: 'No signal is guaranteed. We focus on process and risk management — always validate setups and never risk more than you can afford to lose.' },
      { question: 'How often are signals published?', answer: 'Frequency depends on market conditions. We publish when high-quality setups meet our desk criteria, not on a fixed schedule.' },
      { question: 'Can I use signals for live trading?', answer: 'Signals are educational. Practice on demo first, understand the thesis, and apply your own risk rules before going live.' },
    ],
  },
  {
    id: 'live-sessions', title: 'Live Sessions',
    icon: 'videocam-outline', color: '#FFC107',
    items: [
      { question: 'What are live trading sessions?', answer: 'Real-time market reviews where mentors walk through structure, bias, and execution with the community.' },
      { question: 'How often are live sessions held?', answer: 'Sessions typically run several times per week, with additional coverage around high-impact news events.' },
      { question: 'Can I ask questions during live sessions?', answer: 'Yes. Most sessions include live Q&A via chat so you can clarify setups, risk, or platform questions in real time.' },
      { question: 'Are live sessions recorded?', answer: 'Most sessions are recorded and available for replay in your dashboard for a limited period after the live event.' },
    ],
  },
  {
    id: 'billing', title: 'Billing & Payments',
    icon: 'wallet-outline', color: '#FB923C',
    items: [
      { question: 'What payment methods do you accept?', answer: 'We support USDT (Binance), JazzCash, and EasyPaisa. Available methods shown at checkout.' },
      { question: 'Can I cancel my subscription anytime?', answer: 'Yes. You can cancel from your account settings and retain access through the end of your current billing period.' },
      { question: 'Do you offer refunds?', answer: 'Refund eligibility depends on your package and timing. Contact support with your account email for a case-by-case review.' },
      { question: 'Are there any hidden fees?', answer: 'No hidden fees. The price shown at checkout is the price you pay, including any applicable taxes where required.' },
      { question: 'Can I upgrade my plan?', answer: 'Yes. Plan changes can be requested through support and take effect on the next billing cycle.' },
    ],
  },
  {
    id: 'technical', title: 'Technical Help',
    icon: 'settings-outline', color: 'rgba(255,255,255,0.6)',
    items: [
      { question: 'Why is a video not loading?', answer: 'Try refreshing, clearing cache, or switching networks. If it persists, contact support with the course and lesson name.' },
      { question: 'I forgot my password — what do I do?', answer: 'Use "Forgot password" on the login screen. A reset link will be emailed to your registered address.' },
      { question: 'My account was locked. How do I unlock it?', answer: 'Accounts lock after multiple failed login attempts. Email support with your account email and we\'ll review it.' },
      { question: 'How do I update my profile details?', answer: 'Go to Profile in the app and tap Edit to change your name, phone number, or country.' },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={styles.faqItem}>
      <View style={styles.faqQuestion}>
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.4)" />
      </View>
      {isOpen && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </Pressable>
  );
}

export default function FAQScreen() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<FaqCategory[]>(FAQS);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch('api/faq')
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const categories = data.categories ?? data.faqs ?? data;
        if (Array.isArray(categories) && categories.length > 0) {
          setFaqs(categories as FaqCategory[]);
        }
      })
      .catch(() => {/* use static FAQS */});
  }, []);

  const query = search.trim().toLowerCase();

  const toggle = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = faqs
    .filter((cat) => selectedCat === 'all' || cat.id === selectedCat)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        !query || item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const totalResults = filtered.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>FAQ</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.35)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search questions…"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
      >
        <Pressable
          style={[styles.pill, selectedCat === 'all' && styles.pillActive]}
          onPress={() => setSelectedCat('all')}
        >
          <Text style={[styles.pillText, selectedCat === 'all' && styles.pillTextActive]}>All</Text>
        </Pressable>
        {FAQS.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.pill, selectedCat === cat.id && styles.pillActive, selectedCat === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}18` }]}
            onPress={() => setSelectedCat(cat.id)}
          >
            <Ionicons name={cat.icon} size={13} color={selectedCat === cat.id ? cat.color : 'rgba(255,255,255,0.45)'} />
            <Text style={[styles.pillText, selectedCat === cat.id && { color: cat.color }]}>{cat.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {query && (
          <Text style={styles.resultCount}>{totalResults} result{totalResults !== 1 ? 's' : ''} for "{search}"</Text>
        )}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={44} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try different words or browse all categories.</Text>
          </View>
        ) : (
          filtered.map((cat) => (
            <View key={cat.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}18` }]}>
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Text style={styles.categoryCount}>{cat.items.length}</Text>
              </View>
              <GlassListCard contentStyle={styles.categoryItems}>
                {cat.items.map((item, idx) => {
                  const key = `${cat.id}-${idx}`;
                  return (
                    <View key={key}>
                      <AccordionItem
                        item={item}
                        isOpen={openItems.has(key)}
                        onToggle={() => toggle(key)}
                      />
                      {idx < cat.items.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                  );
                })}
              </GlassListCard>
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, height: 44, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)' },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  pillsScroll: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  pillsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
  pillActive: { borderColor: '#3AADFF', backgroundColor: 'rgba(58,173,255,0.12)' },
  pillText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  pillTextActive: { color: '#3AADFF' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  resultCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontWeight: '500' },
  categoryBlock: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  categoryIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#fff' },
  categoryCount: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  categoryItems: { padding: 0 },
  faqItem: { padding: 14 },
  faqQuestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQuestionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 },
  faqAnswer: { fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginTop: 10, paddingRight: 8 },
  itemDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
