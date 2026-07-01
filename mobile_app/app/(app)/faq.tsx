import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MenuStackHeader, getNeoChipActive, getNeoChipActiveText } from '../../components/navigation/MenuStackHeader';
import { GlassListCard } from '../../components/glass/GlassListCard';
import { apiFetch } from '../../utils/api';

interface FaqItem { question: string; answer: string; }
interface FaqCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: FaqItem[];
}

const FAQS: FaqCategory[] = [
  {
    id: 'getting-started', title: 'Getting Started',
    icon: 'rocket-outline',
    items: [
      { question: 'How do I create an account?', answer: 'Tap "Get started" on the sign-in screen, complete registration, verify your email, and you\'re ready to access the platform.' },
      { question: 'Is there a free trial available?', answer: 'We offer introductory access for new users. Check current packages on the homepage for what\'s included at signup.' },
      { question: 'What do I need to get started?', answer: 'A phone or computer with internet access is enough. No prior trading experience is required — we start from fundamentals.' },
      { question: 'Can I access courses on mobile?', answer: 'Yes. The app is fully responsive so you can learn and follow sessions from anywhere.' },
    ],
  },
  {
    id: 'courses', title: 'Courses & Learning',
    icon: 'book-outline',
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
    icon: 'trending-up-outline',
    items: [
      { question: 'What are trading signals?', answer: 'Signals are educational trade setups with entry, stop-loss, and take-profit levels plus the reasoning behind each idea.' },
      { question: 'How accurate are the signals?', answer: 'No signal is guaranteed. We focus on process and risk management — always validate setups and never risk more than you can afford to lose.' },
      { question: 'How often are signals published?', answer: 'Frequency depends on market conditions. We publish when high-quality setups meet our desk criteria, not on a fixed schedule.' },
      { question: 'Can I use signals for live trading?', answer: 'Signals are educational. Practice on demo first, understand the thesis, and apply your own risk rules before going live.' },
    ],
  },
  {
    id: 'live-sessions', title: 'Live Sessions',
    icon: 'videocam-outline',
    items: [
      { question: 'What are live trading sessions?', answer: 'Real-time market reviews where mentors walk through structure, bias, and execution with the community.' },
      { question: 'How often are live sessions held?', answer: 'Sessions typically run several times per week, with additional coverage around high-impact news events.' },
      { question: 'Can I ask questions during live sessions?', answer: 'Yes. Most sessions include live Q&A via chat so you can clarify setups, risk, or platform questions in real time.' },
      { question: 'Are live sessions recorded?', answer: 'Most sessions are recorded and available for replay in your dashboard for a limited period after the live event.' },
    ],
  },
  {
    id: 'billing', title: 'Billing & Payments',
    icon: 'wallet-outline',
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
    icon: 'settings-outline',
    items: [
      { question: 'Why is a video not loading?', answer: 'Try refreshing, clearing cache, or switching networks. If it persists, contact support with the course and lesson name.' },
      { question: 'I forgot my password — what do I do?', answer: 'Use "Forgot password" on the login screen. A reset link will be emailed to your registered address.' },
      { question: 'My account was locked. How do I unlock it?', answer: 'Accounts lock after multiple failed login attempts. Email support with your account email and we\'ll review it.' },
      { question: 'How do I update my profile details?', answer: 'Go to Profile in the app and tap Edit to change your name, phone number, or country.' },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onToggle} style={[styles.faqItem, isOpen && styles.faqItemOpen]}>
      <View style={styles.faqQuestion}>
        <Text style={styles.faqQuestionText}>{item.question}</Text>
        <View style={[styles.chevronWrap, isOpen && styles.chevronWrapOpen]}>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={isOpen ? colors.primaryForeground : colors.textMuted} />
        </View>
      </View>
      {isOpen ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
    </Pressable>
  );
}

export default function FAQScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <MenuStackHeader title="FAQ" subtitle="Common questions" onBack={() => router.back()} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions…"
          placeholderTextColor={colors.textDim}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

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
        {FAQS.map((cat) => {
          const active = selectedCat === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setSelectedCat(cat.id)}
            >
              <Ionicons name={cat.icon} size={13} color={active ? colors.text : colors.textMuted} />
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {cat.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {query ? (
          <Text style={styles.resultCount}>
            {totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </Text>
        ) : null}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try different words or browse all categories.</Text>
          </View>
        ) : (
          filtered.map((cat) => (
            <View key={cat.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons name={cat.icon} size={16} color={colors.text} />
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{cat.items.length}</Text>
                </View>
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
                      {idx < cat.items.length - 1 ? <View style={styles.itemDivider} /> : null}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  pillsScroll: { maxHeight: 52, marginTop: 8 },
  pillsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { ...getNeoChipActive(colors) },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pillTextActive: { ...getNeoChipActiveText(colors) },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  resultCount: { fontSize: 12, color: colors.textMuted, marginBottom: 14, fontWeight: '500' },
  categoryBlock: { marginBottom: 18 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 2 },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  categoryCount: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCountText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  categoryItems: { padding: 0, overflow: 'hidden' },
  faqItem: { padding: 16 },
  faqItemOpen: { backgroundColor: colors.surfaceHover },
  faqQuestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQuestionText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapOpen: { backgroundColor: colors.primary },
  faqAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: 12,
    paddingRight: 4,
  },
  itemDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  empty: { alignItems: 'center', marginTop: 56, gap: 10, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
}
