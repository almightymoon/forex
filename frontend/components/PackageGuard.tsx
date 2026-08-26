'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { buildApiUrl } from '../utils/api';
import CoolLoader from './CoolLoader';
import { useMaintenanceContext } from '../context/MaintenanceContext';
import {
  clearMonthlyFeeAccessLock,
  hasMonthlyFeeAccessLock,
  isMonthlyFeeStudentExemptPath,
  setMonthlyFeeAccessLock
} from '../utils/monthlyFeeAccessLock';

interface PackageGuardProps {
  children: React.ReactNode;
  /** @deprecated Paths are handled inside the guard; kept for compatibility. */
  allowedPaths?: string[];
}

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/faq',
  '/about',
  '/contact',
  '/terms',
  '/packages',
  '/shop',
  '/f',
  '/e',
];

function isPublicMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isShopPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/shop' || pathname.startsWith('/shop/');
}

function isPaymentFlowPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/payment' ||
    pathname.startsWith('/payment/') ||
    pathname === '/payment-pending' ||
    pathname.startsWith('/payment-pending/')
  );
}

export default function PackageGuard({ children }: PackageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setFromResponse } = useMaintenanceContext();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/teacher')) {
      clearMonthlyFeeAccessLock();
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      if (isPublicMarketingPath(pathname)) {
        setHasAccess(true);
      } else {
        router.replace('/login');
      }
      setIsChecking(false);
      return;
    }

    if (hasMonthlyFeeAccessLock()) {
      if (!isMonthlyFeeStudentExemptPath(pathname)) {
        router.replace('/monthly-fee');
        setHasAccess(false);
        setIsChecking(false);
        return;
      }
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(buildApiUrl('api/users/profile/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 503) {
          try {
            const data = await response.clone().json();
            if (data.maintenanceMode) {
              setFromResponse(true, data.message);
              setHasAccess(true);
              return;
            }
          } catch {
            /* ignore */
          }
        }

        if (response.status === 403) {
          const data = await response.json().catch(() => ({}));

          if (data.code === 'MONTHLY_FEE_REQUIRED') {
            setMonthlyFeeAccessLock();
            if (!isMonthlyFeeStudentExemptPath(pathname)) {
              router.replace('/monthly-fee');
            }
            setHasAccess(true);
            return;
          }

          if (data.code === 'PACKAGE_REQUIRED') {
            clearMonthlyFeeAccessLock();
            // Allow shop browsing and payment submission without an active package.
            if (!isPaymentFlowPath(pathname) && !isShopPath(pathname)) {
              router.replace('/select-package');
            }
            setHasAccess(true);
            return;
          }

          if (data.code === 'PAYMENT_PENDING') {
            clearMonthlyFeeAccessLock();
            if (data.redirectTo === '/payment' && data.paymentId) {
              const pkg = data.packageName ?? '';
              const amt = data.amount ?? 0;
              router.replace(
                `/payment?package=${encodeURIComponent(pkg)}&amount=${amt}&paymentId=${data.paymentId}`
              );
            } else {
              router.replace(data.redirectTo || '/payment-pending');
            }
            setHasAccess(true);
            return;
          }

          if (data.code === 'PAYMENT_REQUIRED') {
            clearMonthlyFeeAccessLock();
            if (!isPaymentFlowPath(pathname)) {
              router.replace(data.redirectTo || '/select-package');
            }
            setHasAccess(true);
            return;
          }

          if (data.code === 'VERIFICATION_PENDING') {
            clearMonthlyFeeAccessLock();
            router.replace('/payment-pending');
            setHasAccess(true);
            return;
          }
        }

        if (response.ok) {
          clearMonthlyFeeAccessLock();
          setHasAccess(true);
          return;
        }

        if (response.status === 401) {
          clearMonthlyFeeAccessLock();
          router.replace('/login');
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error checking package access:', error);
        setHasAccess(true);
      } finally {
        setIsChecking(false);
      }
    };

    verify();
  }, [pathname, router, setFromResponse]);

  if (isChecking) {
    return <CoolLoader message="Verifying access..." />;
  }

  if (!hasAccess) {
    return <CoolLoader message="Redirecting..." />;
  }

  return <>{children}</>;
}
