import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const TOKEN_KEY = 'expoPushToken';
const PUSH_STATUS_KEY = 'pushRegistrationStatus';

type NotificationsModule = typeof import('expo-notifications');

let handlerConfigured = false;
let channelsEnsured = false;

export type PushRegistrationStatus =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | 'unsupported'
        | 'permission_denied'
        | 'missing_project_id'
        | 'fcm_not_configured'
        | 'save_failed'
        | 'error';
      message: string;
    };

/** Map native / Expo errors into a clear user-facing registration status. */
export function classifyPushRegistrationError(error: unknown): PushRegistrationStatus {
  const raw =
    error instanceof Error
      ? `${error.message} ${error.stack || ''}`
      : String(error || '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('firebaseapp is not initialized') ||
    lower.includes('default firebaseapp is not initialized') ||
    lower.includes('fcm-credentials') ||
    lower.includes('google-services') ||
    lower.includes('firebaseapp.initializeapp')
  ) {
    return {
      ok: false,
      reason: 'fcm_not_configured',
      message:
        'Android push is not configured (missing Firebase). This app needs a new build with google-services.json. See mobile_app/PUSH_NOTIFICATIONS.md.',
    };
  }

  return {
    ok: false,
    reason: 'error',
    message:
      error instanceof Error ? error.message : 'Failed to register for push notifications.',
  };
}

/** Remote push is not available in Expo Go (SDK 53+). Use a dev/production build. */
export function isPushNotificationsSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.appOwnership !== 'expo';
}

async function getNotifications(options?: {
  /** Allow loading expo-notifications even when checking channels only */
  allowUnsupported?: boolean;
}): Promise<NotificationsModule | null> {
  if (!options?.allowUnsupported && !isPushNotificationsSupported()) return null;

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

/**
 * Create Android notification channels on every cold start.
 * Backend sends signal alerts with channelId: 'signals' — if the channel
 * was never created, Android 8+ may drop the notification when the app is killed.
 */
export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (channelsEnsured) return;

  try {
    // Channels can be created without push support / permission
    const Notifications = await getNotifications({ allowUnsupported: true });
    if (!Notifications) return;

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#036FFC',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync('signals', {
      name: 'Trading Signals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#036FFC',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    channelsEnsured = true;
  } catch (error) {
    console.warn('[Push] Failed to create Android channels:', error);
  }
}

async function persistRegistrationStatus(status: PushRegistrationStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(PUSH_STATUS_KEY, JSON.stringify(status));
  } catch {
    /* ignore */
  }
}

export async function getPushRegistrationStatus(): Promise<PushRegistrationStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_STATUS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PushRegistrationStatus;
  } catch {
    return null;
  }
}

async function saveTokenToBackend(token: string): Promise<void> {
  const res = await apiFetch('api/mobile/push-token', {
    method: 'PUT',
    body: JSON.stringify({ expoPushToken: token }),
  });

  if (!res.ok) {
    const fallback = await apiFetch('api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ expoPushToken: token, pushNotifications: true }),
    });
    if (!fallback.ok) {
      const text = await fallback.text().catch(() => '');
      throw new Error(`Failed to save push token (${fallback.status}): ${text}`);
    }
  }
}

export async function registerPushToken(): Promise<string | null> {
  const result = await registerPushTokenDetailed();
  return result.ok ? result.token : null;
}

/** Register Expo push token and return a structured status for UI. */
export async function registerPushTokenDetailed(): Promise<PushRegistrationStatus> {
  try {
    if (!isPushNotificationsSupported()) {
      const status: PushRegistrationStatus = {
        ok: false,
        reason: 'unsupported',
        message:
          'Push alerts require a development or production build (not available in Expo Go).',
      };
      await persistRegistrationStatus(status);
      return status;
    }

    const Notifications = await getNotifications();
    if (!Notifications) {
      const status: PushRegistrationStatus = {
        ok: false,
        reason: 'unsupported',
        message: 'Push notifications are not available on this device.',
      };
      await persistRegistrationStatus(status);
      return status;
    }

    // Always ensure channels exist before requesting permission / token
    await ensureAndroidChannels();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let permission = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      permission = asked;
    }
    if (permission !== 'granted') {
      const status: PushRegistrationStatus = {
        ok: false,
        reason: 'permission_denied',
        message: 'Notifications are off — enable them in Settings to get signal alerts.',
      };
      await persistRegistrationStatus(status);
      return status;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      const status: PushRegistrationStatus = {
        ok: false,
        reason: 'missing_project_id',
        message: 'Missing EAS project ID — rebuild the app to enable push alerts.',
      };
      await persistRegistrationStatus(status);
      return status;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);

    try {
      await saveTokenToBackend(token);
    } catch (error) {
      const status: PushRegistrationStatus = {
        ok: false,
        reason: 'save_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not save push token to the server. Try again when online.',
      };
      await persistRegistrationStatus(status);
      return status;
    }

    const okStatus: PushRegistrationStatus = { ok: true, token };
    await persistRegistrationStatus(okStatus);
    console.log('[Push] Token registered');
    return okStatus;
  } catch (error) {
    const status = classifyPushRegistrationError(error);
    await persistRegistrationStatus(status);
    console.warn('[Push] registerPushToken failed:', error);
    return status;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export type NotificationTapHandler = (data: Record<string, unknown>) => void;

let coldStartTapHandled = false;

/** Foreground display + tap-to-open listeners. Returns cleanup function. */
export async function setupNotificationListeners(
  onTap?: NotificationTapHandler,
): Promise<(() => void) | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  // Cold start: user killed the app, tapped a notification — handle once per JS session
  if (!coldStartTapHandled) {
    coldStartTapHandled = true;
    try {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        const data = (last.notification.request.content.data || {}) as Record<string, unknown>;
        onTap?.(data);
      }
    } catch {
      /* ignore */
    }
  }

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
