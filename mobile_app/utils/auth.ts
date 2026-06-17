import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api';

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

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem('token');
}

export async function storeAuth(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    ['token', token],
    ['user', JSON.stringify(user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove(['token', 'user']);
}

/**
 * Determines where to navigate after a successful login.
 * Mirrors the exact logic in the frontend login page.
 */
export async function resolvePostLoginRoute(user?: AuthUser | null): Promise<string> {
  // Non-student roles skip the package check entirely
  const NON_STUDENT_ROLES: UserRole[] = ['teacher', 'admin', 'developer', 'instructor'];
  if (user && NON_STUDENT_ROLES.includes(user.role)) {
    return '/(app)/home';
  }

  try {
    const res = await apiFetch('api/payments/user');

    if (!res.ok) {
      // API unreachable or auth error — use profile endpoint as fallback
      return resolveViaProfile();
    }

    const raw = await res.json();
    // API returns either an array directly or { data: [...] }
    const payments: Array<{ type?: string; status: string; transactionId?: string; package?: { name: string }; finalAmount?: number; amount?: number; _id?: string }> =
      Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

    // Only look at package payments (not monthly_fee, etc.)
    const packagePayments = payments.filter((p) => !p.type || p.type === 'package');

    const completed = packagePayments.find((p) => p.status === 'completed');
    if (completed) return '/(app)/home';

    const pending = packagePayments.find((p) => p.status === 'pending');
    if (pending) {
      const hasTxId = !!(pending.transactionId && String(pending.transactionId).trim());
      if (!hasTxId) {
        // No transaction ID submitted yet — go fill in the payment form
        const pkgName = pending.package?.name ?? '';
        const amount = pending.finalAmount ?? pending.amount ?? 0;
        return `/payment?packageName=${encodeURIComponent(pkgName)}&amount=${amount}`;
      }
      // Proof submitted, awaiting admin approval
      return '/payment-pending';
    }

    // No package payment found at all
    return '/select-package';
  } catch {
    // Network error — try profile as fallback rather than locking them out
    return resolveViaProfile();
  }
}

/**
 * Fallback: check the user profile endpoint which returns 403 with
 * a machine-readable code when package/payment is required.
 */
async function resolveViaProfile(): Promise<string> {
  try {
    const res = await apiFetch('api/users/profile/me');
    if (res.ok) return '/(app)/home';
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'PACKAGE_REQUIRED') return '/select-package';
      if (data.code === 'PAYMENT_PENDING' || data.code === 'VERIFICATION_PENDING') return '/payment-pending';
      if (data.code === 'PAYMENT_REQUIRED') return '/payment';
      if (data.code === 'MONTHLY_FEE_REQUIRED') return '/(app)/monthly-fee';
    }
    if (res.status === 401) return '/auth';
    // Any other status — let them into the app
    return '/(app)/home';
  } catch {
    // Completely offline — let them into the app rather than bouncing them to select-package
    return '/(app)/home';
  }
}
