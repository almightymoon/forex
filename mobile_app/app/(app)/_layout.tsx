import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackground } from '../../components/AppBackground';
import { OfflineBanner } from '../../components/OfflineBanner';
import { FloatingTabBar, getFloatingTabBarInset } from '../../components/navigation/FloatingTabBar';
import { AppBackgroundProvider } from '../../contexts/AppBackgroundContext';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const sceneBottomInset = getFloatingTabBarInset(insets.bottom);

  return (
    <AppBackgroundProvider>
      <View style={styles.root}>
        <AppBackground />
        <BlurView
          intensity={Platform.OS === 'ios' ? 16 : 12}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(4,8,24,0.42)', 'rgba(4,8,24,0.12)', 'transparent']}
          locations={[0, 0.38, 0.68]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <OfflineBanner />
        <Tabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: 'transparent',
              paddingBottom: sceneBottomInset,
            },
            tabBarStyle: {
              position: 'absolute',
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              height: 0,
            },
          }}
        >
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
          <Tabs.Screen name="community" options={{ title: 'Chat' }} />
          <Tabs.Screen name="live-sessions" options={{ href: null }} />
          <Tabs.Screen name="signals" options={{ title: 'Signal' }} />
          <Tabs.Screen name="more" options={{ title: 'Menu' }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="news" options={{ href: null }} />
          <Tabs.Screen name="news-article" options={{ href: null }} />
          <Tabs.Screen name="referrals" options={{ href: null }} />
          <Tabs.Screen name="rank-rewards" options={{ href: null }} />
          <Tabs.Screen name="withdrawals" options={{ href: null }} />
          <Tabs.Screen name="certificates" options={{ href: null }} />
          <Tabs.Screen name="subscription" options={{ href: null }} />
          <Tabs.Screen name="faq" options={{ href: null }} />
          <Tabs.Screen name="support" options={{ href: null }} />
          <Tabs.Screen name="monthly-fee" options={{ href: null }} />
          <Tabs.Screen name="trading-view" options={{ href: null }} />
          <Tabs.Screen name="progress" options={{ href: null }} />
          <Tabs.Screen name="assignments" options={{ href: null }} />
          <Tabs.Screen name="certificate-assignments" options={{ href: null }} />
          <Tabs.Screen name="mt5" options={{ href: null }} />
          <Tabs.Screen name="about" options={{ href: null }} />
          <Tabs.Screen name="terms" options={{ href: null }} />
          <Tabs.Screen name="course/[id]" options={{ href: null }} />
        </Tabs>
      </View>
    </AppBackgroundProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#040818',
  },
});
