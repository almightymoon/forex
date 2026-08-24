import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  isPushNotificationsSupported,
  registerPushToken,
  setupNotificationListeners,
} from '../utils/pushNotifications';

function navigateFromNotificationData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>,
) {
  const link = typeof data.link === 'string' ? data.link : null;
  const type = typeof data.type === 'string' ? data.type : '';

  if (type === 'signal' || type === 'trading_signal' || (link && link.includes('signals'))) {
    router.push('/(app)/signals');
    return;
  }

  if (link) {
    if (link.includes('/notifications') || data.notificationId) {
      router.push('/(app)/notifications');
      return;
    }
    if (link.includes('/payment') || link.includes('/monthly-fee')) {
      router.push('/(app)/monthly-fee');
      return;
    }
  }

  if (data.notificationId || data.type) {
    router.push('/(app)/notifications');
  }
}

/** Registers push token on app open / resume and wires notification tap handling. */
export function PushNotificationSetup() {
  const router = useRouter();
  const registering = useRef(false);

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;

    const register = () => {
      if (registering.current) return;
      registering.current = true;
      void registerPushToken().finally(() => {
        registering.current = false;
      });
    };

    register();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') register();
    };
    const sub = AppState.addEventListener('change', onAppState);

    let cleanup: (() => void) | null = null;
    void setupNotificationListeners((data) => {
      navigateFromNotificationData(router, data);
    }).then((fn) => {
      cleanup = fn;
    });

    return () => {
      sub.remove();
      cleanup?.();
    };
  }, [router]);

  return null;
}
