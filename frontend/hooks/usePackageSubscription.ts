'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../utils/api';
import { useMaintenanceContext } from '../context/MaintenanceContext';

interface PackageSubscriptionStatus {
  hasPackage: boolean;
  isPending: boolean;
  isLoading: boolean;
  paymentId?: string;
  packageName?: string;
}

export function usePackageSubscription() {
  const router = useRouter();
  const { setFromResponse } = useMaintenanceContext();
  const [status, setStatus] = useState<PackageSubscriptionStatus>({
    hasPackage: false,
    isPending: false,
    isLoading: true
  });

  useEffect(() => {
    const checkPackageSubscription = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setStatus({ hasPackage: false, isPending: false, isLoading: false });
          return;
        }

        // Staff (admin/teacher/developer/instructor) should never be forced into package flow.
        // We must derive role from the backend (DB), not from a potentially stale JWT payload.
        try {
          const meRes = await fetch(buildApiUrl('api/auth/me'), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json().catch(() => ({}));
            const role = String(meData?.user?.role || meData?.role || '').toLowerCase();
            if (role && role !== 'student') {
              setStatus({ hasPackage: true, isPending: false, isLoading: false });
              return;
            }
          }
        } catch {
          // If role check fails, fall back to payment-based behavior below.
        }

        // Check user's payments
        const response = await fetch(buildApiUrl('api/payments/user'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Maintenance mode: show maintenance page, do not redirect to select-package
          if (response.status === 503) {
            try {
              const data = await response.json();
              if (data.maintenanceMode) {
                setFromResponse(true, data.message);
                setStatus({ hasPackage: false, isPending: false, isLoading: false });
                return;
              }
            } catch {
              // ignore parse error
            }
          }
          // If we get a package required error, handle it
          if (response.status === 403) {
            const data = await response.json();
            if (data.code === 'PACKAGE_REQUIRED') {
              setStatus({ hasPackage: false, isPending: false, isLoading: false });
              router.push('/select-package');
              return;
            } else if (data.code === 'PAYMENT_PENDING') {
              setStatus({
                hasPackage: false,
                isPending: true,
                isLoading: false,
                paymentId: data.paymentId
              });
              if (data.redirectTo === '/payment' && data.paymentId) {
                const pkg = data.packageName ?? '';
                const amt = data.amount ?? 0;
                router.push(`/payment?package=${encodeURIComponent(pkg)}&amount=${amt}&paymentId=${data.paymentId}`);
              } else {
                router.push(data.redirectTo || '/payment-pending');
              }
              return;
            }
          }
          setStatus({ hasPackage: false, isPending: false, isLoading: false });
          return;
        }

        const payments = await response.json();
        
        // Check for completed package payment
        const completedPayment = payments.find((p: any) => 
          p.type === 'package' && p.status === 'completed'
        );

        if (completedPayment) {
          setStatus({
            hasPackage: true,
            isPending: false,
            isLoading: false,
            packageName: completedPayment.package?.name
          });
          return;
        }

        // Check for pending payment
        const pendingPayment = payments.find((p: any) => 
          p.type === 'package' && p.status === 'pending'
        );

        if (pendingPayment) {
          setStatus({
            hasPackage: false,
            isPending: true,
            isLoading: false,
            paymentId: pendingPayment._id,
            packageName: pendingPayment.package?.name
          });
          const hasTransactionId = !!(pendingPayment.transactionId && String(pendingPayment.transactionId).trim());
          if (!hasTransactionId) {
            const pkg = pendingPayment.package?.name || '';
            const amt = pendingPayment.finalAmount ?? pendingPayment.amount ?? 0;
            router.push(`/payment?package=${encodeURIComponent(pkg)}&amount=${amt}&paymentId=${pendingPayment._id}`);
          } else {
            router.push('/payment-pending');
          }
          return;
        }

        // No package found - redirect to package selection
        setStatus({ hasPackage: false, isPending: false, isLoading: false });
        router.push('/select-package');
      } catch (error) {
        console.error('Error checking package subscription:', error);
        setStatus({ hasPackage: false, isPending: false, isLoading: false });
      }
    };

    checkPackageSubscription();
  }, [router]);

  return status;
}
