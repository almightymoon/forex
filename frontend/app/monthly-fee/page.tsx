'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';

export default function MonthlyFeePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<any>(null);

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : null), []);

  useEffect(() => {
    const init = async () => {
      try {
        if (!token) {
          router.push('/login');
          return;
        }

        // Create (or reuse) a pending monthly fee payment
        const res = await fetch(buildApiUrl('api/payments/monthly-fee'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // If monthly fee is not applicable, just send them to dashboard
          if (data?.message?.includes('not require') || data?.error === 'Monthly fee not applicable') {
            router.push('/dashboard');
            return;
          }
          setError(data?.message || data?.error || 'Failed to initialize monthly fee payment');
          return;
        }

        setPayment(data.payment || null);
      } catch (e) {
        setError('Failed to load monthly fee screen');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <CoolLoader message="Preparing monthly fee..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Fee Required</h1>
          <DarkModeToggle size="sm" />
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-6">
          <p className="text-gray-700 dark:text-gray-200">
            Your access is temporarily restricted because your <span className="font-semibold">monthly fee</span> is due.
            Please complete the payment below. Once admin confirms it, your access will be restored.
          </p>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {payment && (
            <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Amount</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ${Number(payment.finalAmount ?? payment.amount ?? 50).toFixed(2)} {payment.currency || 'USD'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">{payment.status}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Send to wallet</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {payment.binanceWallet?.walletAddress || 'Wallet not set'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Network: {payment.binanceWallet?.network || 'TRC20'}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push('/payment-pending')}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all"
                  type="button"
                >
                  I Already Paid (Go to pending)
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  type="button"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            Note: If payment is not confirmed by admin, access remains restricted.
          </p>
        </div>
      </div>
    </div>
  );
}

