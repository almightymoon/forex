import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiFetch } from './api';
import { AuthUser, resolvePostLoginRoute, storeAuth } from './auth';

const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_CREDS_KEY = 'fx_biometric_credentials';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

export type BiometricCapabilities = {
  available: boolean;
  kind: BiometricKind;
  compatible: boolean;
  enrolled: boolean;
};

export type BiometricLoginResult =
  | { success: true; user: AuthUser; route: string }
  | { success: false; error: string; cancelled?: boolean };

function mapAuthTypes(types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'none';
}

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const kind = mapAuthTypes(types);

  return {
    available: compatible && enrolled,
    kind,
    compatible,
    enrolled,
  };
}

export function getBiometricLabel(kind: BiometricKind): string {
  switch (kind) {
    case 'face':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris scan';
    default:
      return 'Biometrics';
  }
}

export function getBiometricIcon(kind: BiometricKind): 'scan-outline' | 'finger-print-outline' {
  return kind === 'fingerprint' ? 'finger-print-outline' : 'scan-outline';
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    return;
  }
  await clearBiometricCredentials();
}

export async function hasBiometricCredentials(): Promise<boolean> {
  if (!(await isBiometricLoginEnabled())) return false;
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
    return !!raw;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(
    BIOMETRIC_CREDS_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), password }),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
  );
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
}

export async function clearBiometricCredentials(): Promise<void> {
  await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY);
  } catch {
    /* item may not exist */
  }
}

export async function authenticateBiometric(promptMessage?: string): Promise<boolean> {
  const { available } = await getBiometricCapabilities();
  if (!available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage ?? 'Sign in to The FX Navigators',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use passcode',
  });

  return result.success;
}

export async function loginWithBiometrics(): Promise<BiometricLoginResult> {
  const { available, kind } = await getBiometricCapabilities();
  if (!available) {
    return { success: false, error: 'Biometric authentication is not available on this device.' };
  }

  if (!(await hasBiometricCredentials())) {
    return { success: false, error: 'No saved login. Sign in with email and password first.' };
  }

  const authenticated = await authenticateBiometric(`Sign in with ${getBiometricLabel(kind)}`);
  if (!authenticated) {
    return { success: false, error: 'Authentication cancelled.', cancelled: true };
  }

  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
  } catch {
    return { success: false, error: 'Could not read saved login. Please sign in with your password.' };
  }

  if (!raw) {
    return { success: false, error: 'Saved login not found. Please sign in with your password.' };
  }

  let creds: { email: string; password: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    await clearBiometricCredentials();
    return { success: false, error: 'Saved login is invalid. Please sign in again.' };
  }

  try {
    const res = await apiFetch('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      await storeAuth(data.token, data.user);
      const route = await resolvePostLoginRoute(data.user);
      return { success: true, user: data.user, route };
    }
    return {
      success: false,
      error: data.message ?? data.error ?? 'Login failed. Please use your password.',
    };
  } catch {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}
