import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const TOKEN_KEY = 'expoPushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

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
