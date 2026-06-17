import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SplashLoader } from '../components/SplashLoader';
import { getStoredToken, getStoredUser, resolvePostLoginRoute } from '../utils/auth';

const MIN_SPLASH_MS = 2200;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function SplashScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('Preparing your dashboard…');

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [, token] = await Promise.all([
        wait(MIN_SPLASH_MS),
        getStoredToken(),
      ]);

      if (cancelled) return;

      if (token) {
        setMessage('Loading your account…');
        const user = await getStoredUser();
        const route = await resolvePostLoginRoute(user);
        if (!cancelled) router.replace(route as never);
        return;
      }

      if (!cancelled) router.replace('/auth');
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <SplashLoader message={message} />;
}
