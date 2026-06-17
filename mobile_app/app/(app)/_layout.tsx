import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { ScreenBackground } from '../../components/ScreenBackground';
import { colors } from '../../constants/theme';
import { recordQuickAccessRoute } from '../../utils/quickAccess';

function TabIcon({ icon, focused }: { icon: AppIconName; focused: boolean }) {
  return (
    <View style={tabStyles.wrap}>
      <View style={[tabStyles.iconShell, focused && tabStyles.iconShellActive]}>
        <AppIcon
          name={icon}
          size={focused ? 22 : 21}
          color={focused ? '#fff' : colors.textSecondary}
          strokeWidth={focused ? 2.3 : 2}
        />
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  barBg: {
    backgroundColor: '#060b18',
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellActive: {
    backgroundColor: colors.blue,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default function AppLayout() {
  return (
    <ScreenBackground variant="app">
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, tabStyles.barBg]} />
            ),
          tabBarItemStyle: {
            paddingHorizontal: 0,
            marginHorizontal: 0,
          },
          tabBarStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#060b18',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.08)',
            height: Platform.OS === 'ios' ? 72 : 56,
            paddingBottom: Platform.OS === 'ios' ? 22 : 8,
            paddingTop: 6,
            paddingHorizontal: 6,
            elevation: 0,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="courses" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="community" focused={focused} />
            ),
          }}
          listeners={{ tabPress: () => { void recordQuickAccessRoute('/(app)/community'); } }}
        />
        <Tabs.Screen name="live-sessions" options={{ href: null }} />
        <Tabs.Screen
          name="signals"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="candlestick" focused={focused} />
            ),
          }}
          listeners={{ tabPress: () => { void recordQuickAccessRoute('/(app)/signals'); } }}
        />
        <Tabs.Screen
          name="more"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="more" focused={focused} />
            ),
          }}
        />
        {/* Hidden routes */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="news" options={{ href: null }} />
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
    </ScreenBackground>
  );
}
