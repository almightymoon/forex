import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getAuthToken, invalidateTokenCache, primeAuthToken } from './api';
import { clearAppCache } from './clearAppCache';
import { isOnline } from './network';

export type UserRole = 'student' | 'teacher' | 'admin' | 'developer' | 'instructor';

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  referralCode?: string;
}

let _cachedUser: AuthUser | null | undefined;

export function invalidateUserCache() {
  _cachedUser = undefined;
}

export async function getStoredUser(): Promise<AuthUser | null> {
  if (_cachedUser !== undefined) return _cachedUser;
  try {
    const raw = await AsyncStorage.getItem('user');
    _cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
    return _cachedUser;
  } catch {
    _cachedUser = null;
    return null;
  }
}

/** Warm token + user into memory on app start — one AsyncStorage read each. */
export async function preloadAuthStorage(): Promise<void> {
  await Promise.all([getAuthToken(), getStoredUser()]);
}

export async function getStoredToken(): Promise<string | null> {
  return getAuthToken();
}

export async function storeAuth(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    ['token', token],
    ['user', JSON.stringify(user)],
  ]);
  primeAuthToken(token);
  _cachedUser = user;
}

export async function clearAuth(): Promise<void> {
  void apiFetch('api/auth/logout', { method: 'POST' }).catch(() => {});
  await AsyncStorage.multiRemove(['token', 'user']);
  invalidateTokenCache();
  invalidateUserCache();
  void clearAppCache();
}

const LAST_ROUTE_KEY = 'last_app_route';

export async function saveLastAppRoute(route: string): Promise<void> {
  if (route.startsWith('/(app)/')) {
    await AsyncStorage.setItem(LAST_ROUTE_KEY, route);
  }
}

async function getLastAppRoute(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_ROUTE_KEY);
}

/**
 * Determines where to navigate after a successful login.
 * Mirrors the exact logic in the frontend login page.
 */
export async function resolvePostLoginRoute(user?: AuthUser | null): Promise<string> {
  if (!(await isOnline())) {
    if (!user) return '/auth';
    return (await getLastAppRoute()) ?? '/(app)/home';
  }

  const NON_STUDENT_ROLES: UserRole[] = ['teacher', 'admin', 'developer', 'instructor'];
  if (user && NON_STUDENT_ROLES.includes(user.role)) {
    await saveLastAppRoute('/(app)/home');
    return '/(app)/home';
  }

  try {
    const res = await apiFetch('api/payments/user');

    if (!res.ok) {
      return resolveViaProfile();
    }

    const raw = await res.json();
    const payments: Array<{ type?: string; status: string; transactionId?: string; package?: { name: string }; finalAmount?: number; amount?: number; _id?: string }> =
      Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

    const packagePayments = payments.filter((p) => !p.type || p.type === 'package');

    const completed = packagePayments.find((p) => p.status === 'completed');
    if (completed) {
      await saveLastAppRoute('/(app)/home');
      return '/(app)/home';
    }

    const pending = packagePayments.find((p) => p.status === 'pending');
    if (pending) {
      const hasTxId = !!(pending.transactionId && String(pending.transactionId).trim());
      if (!hasTxId) {
        const pkgName = pending.package?.name ?? '';
        const amount = pending.finalAmount ?? pending.amount ?? 0;
        return `/payment?packageName=${encodeURIComponent(pkgName)}&amount=${amount}`;
      }
      return '/payment-pending';
    }

    return '/select-package';
  } catch {
    if (!(await isOnline())) return (await getLastAppRoute()) ?? '/(app)/home';
    return resolveViaProfile();
  }
}

async function resolveViaProfile(): Promise<string> {
  try {
    const res = await apiFetch('api/users/profile/me');
    if (res.ok) {
      await saveLastAppRoute('/(app)/home');
      return '/(app)/home';
    }
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'PACKAGE_REQUIRED') return '/select-package';
      if (data.code === 'PAYMENT_PENDING' || data.code === 'VERIFICATION_PENDING') return '/payment-pending';
      if (data.code === 'PAYMENT_REQUIRED') return '/payment';
      if (data.code === 'MONTHLY_FEE_REQUIRED') return '/(app)/monthly-fee';
    }
    if (res.status === 401) return '/auth';
    await saveLastAppRoute('/(app)/home');
    return '/(app)/home';
  } catch {
    if (!(await isOnline())) return (await getLastAppRoute()) ?? '/(app)/home';
    return '/(app)/home';
  }
}
