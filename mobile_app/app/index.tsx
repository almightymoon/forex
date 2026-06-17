import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Logo } from '../components/Logo';
import { ScreenBackground } from '../components/ScreenBackground';
import { getStoredToken, getStoredUser, resolvePostLoginRoute } from '../utils/auth';

const SPLASH_DURATION_MS = 2000;

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const token = await getStoredToken();
      if (token) {
        // User has a stored session — check their payment/package status
        const user = await getStoredUser();
        const route = await resolvePostLoginRoute(user);
        router.replace(route as any);
      } else {
        router.replace('/auth');
      }
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ScreenBackground variant="splash">
      <View style={styles.container}>
        <Logo size="lg" />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
