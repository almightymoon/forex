/** Session flag: student must stay in monthly-fee / payment flow until fee is cleared server-side. */
export const MONTHLY_FEE_ACCESS_LOCK_KEY = 'fxNavigators:monthlyFeeAccessLock';

export function setMonthlyFeeAccessLock(): void {
  try {
    if (typeof window !== 'undefined') sessionStorage.setItem(MONTHLY_FEE_ACCESS_LOCK_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearMonthlyFeeAccessLock(): void {
  try {
    if (typeof window !== 'undefined') sessionStorage.removeItem(MONTHLY_FEE_ACCESS_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

export function hasMonthlyFeeAccessLock(): boolean {
  try {
    return typeof window !== 'undefined' && sessionStorage.getItem(MONTHLY_FEE_ACCESS_LOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Routes allowed while the monthly-fee lock is active (pay + proof + pending). */
export function isMonthlyFeeStudentExemptPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/monthly-fee' || pathname.startsWith('/monthly-fee/')) return true;
  if (pathname === '/payment' || pathname.startsWith('/payment/')) return true;
  if (pathname === '/payment-pending' || pathname.startsWith('/payment-pending/')) return true;
  return false;
}
