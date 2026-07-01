import { useRouter } from 'expo-router';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import { GlassDivider, GlassSection } from '../../components/glass/GlassSection';
import { MenuProfileCard } from '../../components/menu/MenuProfileCard';
import { MenuQuickGrid, type QuickAccessItem } from '../../components/menu/MenuQuickGrid';
import { MenuRow, type MenuRowItem } from '../../components/menu/MenuRow';
import { clearAuth, getStoredUser, type AuthUser } from '../../utils/auth';

type MenuSection = {
  title: string;
  items: MenuRowItem[];
};

export default function MoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const push = (route: string) => router.push(route as never);

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/auth');
  };

  const quickAccess: QuickAccessItem[] = [
    { icon: 'courses', label: 'Courses', onPress: () => push('/(app)/courses') },
    { icon: 'file-text', label: 'Market News', onPress: () => push('/(app)/news') },
    { icon: 'candlestick', label: 'Signals', onPress: () => push('/(app)/signals') },
    { icon: 'users', label: 'Community', onPress: () => push('/(app)/community') },
  ];

  const sections: MenuSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'notifications',
          label: 'Notifications',
          subtitle: 'Alerts, signals and updates',
          onPress: () => push('/(app)/notifications'),
        },
        {
          icon: 'settings',
          label: 'Settings',
          subtitle: 'Security, password and appearance',
          onPress: () => push('/(app)/settings'),
        },
        {
          icon: 'layers',
          label: 'Subscription',
          subtitle: 'Plan, billing and upgrades',
          onPress: () => push('/(app)/subscription'),
        },
      ],
    },
    {
      title: 'Learning',
      items: [
        {
          icon: 'layers',
          label: 'Shop',
          subtitle: 'Merch, tools and digital products',
          onPress: () => push('/(app)/shop'),
        },
        {
          icon: 'book-open',
          label: 'All Courses',
          subtitle: 'Browse and continue learning',
          onPress: () => push('/(app)/courses'),
        },
        {
          icon: 'file-text',
          label: 'Library',
          subtitle: 'Sheets, PDFs, books and desk resources',
          onPress: () => push('/(app)/library'),
        },
        {
          icon: 'bar-chart',
          label: 'My Progress',
          subtitle: 'Track completion and stats',
          onPress: () => push('/(app)/progress'),
        },
        {
          icon: 'clipboard',
          label: 'Assignments',
          subtitle: 'Submit and review tasks',
          onPress: () => push('/(app)/assignments'),
        },
        {
          icon: 'award',
          label: 'Certificates',
          subtitle: 'Download your credentials',
          onPress: () => push('/(app)/certificates'),
        },
        {
          icon: 'graduation-cap',
          label: 'Certificate Tasks',
          subtitle: 'Complete tasks to earn certificates',
          onPress: () => push('/(app)/certificate-assignments'),
        },
      ],
    },
    {
      title: 'Rewards & payouts',
      items: [
        {
          icon: 'share',
          label: 'Referrals',
          subtitle: 'Invite friends and earn',
          onPress: () => push('/(app)/referrals'),
        },
        {
          icon: 'trophy',
          label: 'Rank Rewards',
          subtitle: 'Unlock milestone bonuses',
          onPress: () => push('/(app)/rank-rewards'),
        },
        {
          icon: 'wallet',
          label: 'Withdrawals',
          subtitle: 'Request USDT payouts',
          onPress: () => push('/(app)/withdrawals'),
        },
      ],
    },
    {
      title: 'Help & legal',
      items: [
        {
          icon: 'help',
          label: 'FAQ',
          subtitle: 'Common questions answered',
          onPress: () => push('/(app)/faq'),
        },
        {
          icon: 'headphones',
          label: 'Contact Support',
          subtitle: 'Get help from our team',
          onPress: () => push('/(app)/support'),
        },
        {
          icon: 'info',
          label: 'About FX Navigators',
          onPress: () => push('/(app)/about'),
        },
        {
          icon: 'file-text',
          label: 'Terms of Service',
          onPress: () => push('/(app)/terms'),
        },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Menu</Text>
          <Text style={styles.pageSubtitle}>Account, tools & support</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MenuProfileCard user={user} onPress={() => push('/(app)/profile')} />

        <MenuQuickGrid items={quickAccess} />

        {sections.map((section) => (
          <GlassSection key={section.title} title={section.title}>
            {section.items.map((item, idx) => (
              <View key={item.label}>
                <MenuRow item={item} />
                {idx < section.items.length - 1 ? <GlassDivider inset={62} /> : null}
              </View>
            ))}
          </GlassSection>
        ))}

        <View style={styles.signOutWrap}>
          <GlassCard contentStyle={styles.signOutCard} radius={16}>
            <MenuRow
              item={{
                icon: 'log-out',
                label: 'Sign out',
                subtitle: 'Log out of this device',
                destructive: true,
                onPress: handleLogout,
              }}
            />
          </GlassCard>
          <Text style={styles.versionHint}>FX Navigators · Student app</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  signOutWrap: { gap: 12, marginTop: 4 },
  signOutCard: { padding: 0 },
  versionHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDim,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
}
