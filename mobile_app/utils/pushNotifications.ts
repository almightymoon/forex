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
  } catch {
    return null;
  }
}

export async function registerPushToken(): Promise<string | null> {
  try {
    const Notifications = await getNotifications();
    if (!Notifications) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);

    await apiFetch('api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ expoPushToken: token }),
    }).catch(() => {/* backend may not have field yet */});

    return token;
  } catch {
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
