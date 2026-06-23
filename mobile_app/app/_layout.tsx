import { Asset } from 'expo-asset';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineScreenIndicator } from '../components/OfflineScreenIndicator';
import { preloadAuthStorage } from '../utils/auth';
import { onSessionExpired } from '../utils/api';

SplashScreen.preventAutoHideAsync();

const preloadAssets = [
  require('../assets/images/bg-splash.png'),
  require('../assets/images/bg-auth.png'),
  require('../assets/images/logo.png'),
  require('../assets/images/space-background.png'),
  require('../assets/images/image 10.png'),
  require('../assets/images/image 11.png'),
  require('../assets/images/image 12.png'),
];

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void preloadAuthStorage();
    onSessionExpired(() => {
      router.replace('/auth');
    });
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await Asset.loadAsync(preloadAssets);
      } catch (error) {
        console.warn('Asset preload failed:', error);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaProvider>
        <ErrorBoundary>
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="disclaimer" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="select-package" />
              <Stack.Screen name="payment" />
              <Stack.Screen name="payment-pending" />
              <Stack.Screen name="subscription-upgrade" />
              <Stack.Screen name="reset-password" />
              {/* Main app — tab navigator lives inside (app) group */}
              <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
            </Stack>
            <OfflineScreenIndicator />
          </View>
        </ErrorBoundary>
      </SafeAreaProvider>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
