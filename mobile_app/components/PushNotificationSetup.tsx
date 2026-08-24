import { useRouter } from 'expo-router';
import { useEffect } from 'react';
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

/** Registers push token on app open and wires notification tap handling. */
export function PushNotificationSetup() {
  const router = useRouter();

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;

    void registerPushToken();

    let cleanup: (() => void) | null = null;
    void setupNotificationListeners((data) => {
      navigateFromNotificationData(router, data);
    }).then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, [router]);

  return null;
}
