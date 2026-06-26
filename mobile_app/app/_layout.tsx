import { Asset } from 'expo-asset';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineScreenIndicator } from '../components/OfflineScreenIndicator';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { preloadAuthStorage } from '../utils/auth';
import { flushCrashLogsToServer, installCrashHandlers, recordCrashLog } from '../utils/crashReporter';
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
    installCrashHandlers();
    void preloadAuthStorage();
    void flushCrashLogsToServer();
    onSessionExpired(() => {
      router.replace('/auth');
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void flushCrashLogsToServer();
      }
    });
    const prevRejection = globalThis.onunhandledrejection as
      | ((event: PromiseRejectionEvent) => void)
      | undefined;
    globalThis.onunhandledrejection = (event: PromiseRejectionEvent) => {
      void recordCrashLog('unhandled_rejection', event?.reason ?? event);
      prevRejection?.(event);
    };
    return () => {
      sub.remove();
      globalThis.onunhandledrejection = prevRejection ?? null;
    };
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
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}

function ThemedRoot() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style={colors.statusBar} />
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
