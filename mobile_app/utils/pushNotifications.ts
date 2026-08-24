import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const TOKEN_KEY = 'expoPushToken';

type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;

/** Remote push is not available in Expo Go (SDK 53+). Use a dev/production build. */
export function isPushNotificationsSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.appOwnership !== 'expo';
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!isPushNotificationsSupported()) return null;

  try {
    const Notifications = await import('expo-notifications');
    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }
    return Notifications;
  } catch (error) {
    console.warn('[Push] Failed to load expo-notifications:', error);
    return null;
  }
}

async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#036FFC',
    sound: 'default',
  });
  // Dedicated high-priority channel for trading signals (matches backend channelId)
  await Notifications.setNotificationChannelAsync('signals', {
    name: 'Trading Signals',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#036FFC',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

async function saveTokenToBackend(token: string): Promise<void> {
  const res = await apiFetch('api/mobile/push-token', {
    method: 'PUT',
    body: JSON.stringify({ expoPushToken: token }),
  });

  if (!res.ok) {
    const fallback = await apiFetch('api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ expoPushToken: token }),
    });
    if (!fallback.ok) {
      const text = await fallback.text().catch(() => '');
      throw new Error(`Failed to save push token (${fallback.status}): ${text}`);
    }
  }
}

export async function registerPushToken(): Promise<string | null> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;

    await ensureAndroidChannel(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }
    if (status !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await saveTokenToBackend(token);
    console.log('[Push] Token registered');
    return token;
  } catch (error) {
    console.warn('[Push] registerPushToken failed:', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export type NotificationTapHandler = (data: Record<string, unknown>) => void;

/** Foreground display + tap-to-open listeners. Returns cleanup function. */
export async function setupNotificationListeners(
  onTap?: NotificationTapHandler,
): Promise<(() => void) | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Push] Received in foreground:', notification.request.content.title);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
    onTap?.(data);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
