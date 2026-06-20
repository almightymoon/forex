import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SplashLoader } from '../components/SplashLoader';
import { getStoredToken, getStoredUser, resolvePostLoginRoute } from '../utils/auth';
import { hasCompletedOnboarding } from '../utils/onboarding';
import { isOnline } from '../utils/network';
import { SPLASH_BOOT_MESSAGE } from '../components/splash/splashPhrases';

const MIN_SPLASH_MS = 2200;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function SplashScreen() {
  const router = useRouter();
  const [message, setMessage] = useState(SPLASH_BOOT_MESSAGE);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [, token] = await Promise.all([
        wait(MIN_SPLASH_MS),
        getStoredToken(),
      ]);

      if (cancelled) return;

      if (token) {
        const online = await isOnline();
        setMessage(online ? 'Loading your account…' : 'Loading offline…');
        const user = await getStoredUser();
        const route = await resolvePostLoginRoute(user);
        if (!cancelled) router.replace(route as never);
        return;
      }

      if (!cancelled) {
        const done = await hasCompletedOnboarding();
        router.replace((done ? '/auth' : '/onboarding') as never);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <SplashLoader message={message} />;
}
