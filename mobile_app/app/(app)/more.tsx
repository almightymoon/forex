import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { clearAuth, getStoredUser, AuthUser } from '../../utils/auth';

type MenuItem = {
  icon: AppIconName;
  label: string;
  route?: string;
  color?: string;
  onPress?: () => void;
};

export default function MoreScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => { getStoredUser().then(setUser); }, []);

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/auth');
  };

  const menuSections: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'My Profile', route: '/(app)/profile' },
        { icon: 'notifications', label: 'Notifications', route: '/(app)/notifications' },
        { icon: 'settings', label: 'Settings', route: '/(app)/settings' },
      ],
    },
    {
      title: 'Trading & Learning',
      items: [
        { icon: 'candlestick', label: 'Trading Signals', route: '/(app)/signals' },
        { icon: 'file-text', label: 'Market News', color: '#00D4FF', route: '/(app)/news' },
        { icon: 'live-charts', label: 'Live Charts', color: '#F59E0B', route: '/(app)/trading-view' },
        { icon: 'video', label: 'Live Sessions', route: '/(app)/live-sessions' },
        { icon: 'users', label: 'Community', color: '#A78BFA', route: '/(app)/community' },
        { icon: 'bar-chart', label: 'My Progress', color: '#E879F9', route: '/(app)/progress' },
        { icon: 'clipboard', label: 'Assignments', color: '#22D3EE', route: '/(app)/assignments' },
      ],
    },
    {
      title: 'Earnings',
      items: [
        { icon: 'share', label: 'Referrals', color: '#FFC107', route: '/(app)/referrals' },
        { icon: 'trophy', label: 'Rank Rewards', color: '#F59E0B', route: '/(app)/rank-rewards' },
        { icon: 'wallet', label: 'Withdrawals', color: '#4ADE80', route: '/(app)/withdrawals' },
        { icon: 'award', label: 'Certificates', color: '#E879F9', route: '/(app)/certificates' },
        { icon: 'file-text', label: 'Certificate Tasks', color: '#A78BFA', route: '/(app)/certificate-assignments' },
        { icon: 'layers', label: 'My Subscription', color: '#3AADFF', route: '/(app)/subscription' },
      ],
    },
    {
      title: 'Help',
      items: [
        { icon: 'help', label: 'FAQ', color: '#3AADFF', route: '/(app)/faq' },
        { icon: 'headphones', label: 'Support', color: '#22D3EE', route: '/(app)/support' },
        { icon: 'info', label: 'About Us', route: '/(app)/about' },
        { icon: 'file-text', label: 'Terms of Service', route: '/(app)/terms' },
      ],
    },
    {
      title: '',
      items: [
        { icon: 'log-out', label: 'Sign Out', color: '#FF5A5A', onPress: handleLogout },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>More</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.profileCard} onPress={() => router.push('/(app)/profile')}>
          <View style={styles.avatarWrap}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user ? `${user.firstName} ${user.lastName}` : 'Loading...'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{(user?.role ?? 'student').toUpperCase()}</Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.3)" strokeWidth={2} />
        </Pressable>

        {menuSections.map((section, si) => (
          <View key={si} style={styles.section}>
            {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <View key={idx}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={item.route ? () => router.push(item.route as any) : item.onPress}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: `${item.color ?? '#3AADFF'}15` }]}>
                      <AppIcon name={item.icon} size={18} color={item.color ?? '#3AADFF'} strokeWidth={2.1} />
                    </View>
                    <Text style={[styles.menuLabel, item.color === '#FF5A5A' && { color: '#FF5A5A' }]}>{item.label}</Text>
                    <AppIcon name="chevron-right" size={16} color="rgba(255,255,255,0.2)" strokeWidth={2} />
                  </Pressable>
                  {idx < section.items.length - 1 && <View style={styles.menuDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 20 },
  profileCard: {
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.2)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,96,230,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(58,173,255,0.3)',
  },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: '#3AADFF' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 12.5, color: 'rgba(255,255,255,0.4)' },
  roleBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,96,230,0.2)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  roleText: { fontSize: 10, fontWeight: '700', color: '#3AADFF', letterSpacing: 0.5 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 4 },
  menuCard: { backgroundColor: 'rgba(8,20,48,0.85)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#fff' },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 62 },
});
