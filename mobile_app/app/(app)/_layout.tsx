import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { ScreenBackground } from '../../components/ScreenBackground';
import { recordQuickAccessRoute } from '../../utils/quickAccess';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused, label }: { name: IconName; focused: boolean; label: string }) {
  return (
    <View style={tabStyles.wrap}>
      <Ionicons
        name={focused ? name.replace('-outline', '') as IconName : name}
        size={20}
        color={focused ? '#3AADFF' : 'rgba(255,255,255,0.35)'}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[tabStyles.label, focused && tabStyles.labelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 3,
    minWidth: 0,
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
  labelActive: {
    color: '#3AADFF',
    fontWeight: '700',
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
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,12,30,0.97)' }]} />
            ),
          tabBarItemStyle: {
            paddingHorizontal: 0,
            marginHorizontal: 0,
          },
          tabBarStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(4,12,30,0.97)',
            borderTopWidth: 1,
            borderTopColor: 'rgba(58,173,255,0.12)',
            height: Platform.OS === 'ios' ? 82 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 0,
            paddingHorizontal: 4,
            elevation: 0,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} label="Home" />,
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="book-outline" focused={focused} label="Courses" />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="chatbubbles-outline" focused={focused} label="Community" />,
          }}
          listeners={{ tabPress: () => { void recordQuickAccessRoute('/(app)/community'); } }}
        />
        <Tabs.Screen name="live-sessions" options={{ href: null }} />
        <Tabs.Screen
          name="signals"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="trending-up-outline" focused={focused} label="Signals" />,
          }}
          listeners={{ tabPress: () => { void recordQuickAccessRoute('/(app)/signals'); } }}
        />
        <Tabs.Screen
          name="more"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="grid-outline" focused={focused} label="More" />,
          }}
        />
        {/* Hidden routes — not shown in tab bar */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
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
