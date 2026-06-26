import { Tabs } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { AppBackground } from '../../components/AppBackground';
import { FloatingTabBar, getFloatingTabBarInset } from '../../components/navigation/FloatingTabBar';
import { AppBackgroundProvider } from '../../contexts/AppBackgroundContext';
import { useTheme } from '../../contexts/ThemeContext';

const TAB_BAR_STYLE = {
  position: 'absolute' as const,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  elevation: 0,
  height: 0,
};

function AppLayoutInner() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const sceneBottomInset = getFloatingTabBarInset(insets.bottom);

  const renderTabBar = useCallback(
    (props: Parameters<typeof FloatingTabBar>[0]) => <FloatingTabBar {...props} />,
    [],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      sceneStyle: { backgroundColor: 'transparent', paddingBottom: sceneBottomInset },
      tabBarStyle: TAB_BAR_STYLE,
    }),
    [sceneBottomInset],
  );

  return (
    <ErrorBoundary>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppBackground />
        <Tabs tabBar={renderTabBar} screenOptions={screenOptions}>
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
    </ErrorBoundary>
  );
}

export default function AppLayout() {
  return (
    <AppBackgroundProvider>
      <AppLayoutInner />
    </AppBackgroundProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
