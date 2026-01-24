'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../utils/api';

interface PackageSubscriptionStatus {
  hasPackage: boolean;
  isPending: boolean;
  isLoading: boolean;
  paymentId?: string;
  packageName?: string;
}

export function usePackageSubscription() {
  const router = useRouter();
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

        // Check user's payments
        const response = await fetch(buildApiUrl('api/payments/user'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
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
              router.push('/payment-pending');
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
          router.push('/payment-pending');
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
