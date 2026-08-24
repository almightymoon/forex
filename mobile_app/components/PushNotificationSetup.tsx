import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  ensureAndroidChannels,
  isPushNotificationsSupported,
  registerPushTokenDetailed,
  setupNotificationListeners,
} from '../utils/pushNotifications';
import { resolvePushDataRoute } from '../utils/notificationRouting';
import { invalidateCachedEndpoints } from '../utils/offlineCache';

function navigateFromNotificationData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown>,
) {
  const route = resolvePushDataRoute(data);
  if (route) {
    router.push(route as never);
    return;
  }

  if (data.notificationId || data.type) {
    router.push('/(app)/notifications');
  }
}

/** Registers push token on app open / resume and wires notification tap handling. */
export function PushNotificationSetup() {
  const router = useRouter();
  const registering = useRef(false);
  const handledColdStartTap = useRef(false);

  useEffect(() => {
    // Always create Android channels on cold start (even if Expo Go / permission denied)
    void ensureAndroidChannels();

    if (!isPushNotificationsSupported()) return;

    const register = () => {
      if (registering.current) return;
      registering.current = true;
      void registerPushTokenDetailed().finally(() => {
        registering.current = false;
      });
    };

    register();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void ensureAndroidChannels();
        register();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    let cleanup: (() => void) | null = null;
    void setupNotificationListeners(
      (data) => {
        // Avoid double-navigating if cold-start response fires with mount
        if (handledColdStartTap.current && Object.keys(data).length === 0) return;
        handledColdStartTap.current = true;
        navigateFromNotificationData(router, data);
      },
      () => {
        // A push landed — drop stale lists so the next screen visit shows it
        void invalidateCachedEndpoints(/signals|notifications/i);
      },
    ).then((fn) => {
      cleanup = fn;
    });

    return () => {
      sub.remove();
      cleanup?.();
    };
  }, [router]);

  return null;
}
