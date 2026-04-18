'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Copy, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export interface HistoryEntry {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  feeForMonthStart: string;
  feeForMonthLabel: string;
  transactionId: string | null;
  transactionHash: string | null;
  adminConfirmed: boolean;
  paymentMethod?: string;
}

interface Props {
  userId: string;
  onConfirmed?: () => void;
  /** User details tab: show intro + refresh */
  embedded?: boolean;
  /** Standalone modal: show refresh without full embedded chrome */
  showRefreshButton?: boolean;
}

export default function MonthlyFeeHistoryPanel({ userId, onConfirmed, embedded, showRefreshButton }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    policy: Record<string, unknown> | null;
    latestPackagePayment: Record<string, unknown> | null;
    entries: HistoryEntry[];
  } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${userId}/monthly-fee-history`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string })?.error || 'Failed to load history');
        setData(null);
        return;
      }
      setData({
        policy: json.policy || null,
        latestPackagePayment: json.latestPackagePayment || null,
        entries: Array.isArray(json.entries) ? json.entries : []
      });
    } catch {
      setError('Failed to load history');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  };

  const confirmPayment = async (paymentId: string) => {
    const token = localStorage.getItem('token');
    setConfirmingId(paymentId);
    try {
      const res = await fetch(buildApiUrl('api/payments/admin/confirm'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Payment confirmed', 'success');
        onConfirmed?.();
        const reload = await fetch(buildApiUrl(`api/admin/users/${userId}/monthly-fee-history`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = await reload.json().catch(() => ({}));
        if (reload.ok) {
          setData({
            policy: j.policy || null,
            latestPackagePayment: j.latestPackagePayment || null,
            entries: Array.isArray(j.entries) ? j.entries : []
          });
        }
      } else {
        showToast((json as { error?: string })?.error || 'Confirm failed', 'error');
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const policy = data?.policy as Record<string, unknown> & {
    monthlyFeeEnabled?: boolean;
    applies?: boolean;
    pastMonthLabel?: string;
    dueForMonth?: string;
    paidForCurrentCycle?: boolean;
    packageName?: string;
  };

  return (
    <div className="space-y-4">
      {(embedded || showRefreshButton) && (
        <div
          className={`flex flex-wrap items-center gap-2 mb-1 ${
            embedded ? 'justify-between' : 'justify-end'
          }`}
        >
          {embedded && (
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[90%]">
              Each row shows which UTC month the payment satisfies and when it was recorded. Use refresh after confirming
              elsewhere.
            </p>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          Loading…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-8">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      ) : (
        <>
          {policy && policy.monthlyFeeEnabled === false && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30 px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
              No monthly fee applies for this package tier ({policy.packageName || '—'}).
            </div>
          )}
          {policy && policy.monthlyFeeEnabled !== false && policy.applies !== false && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 space-y-1">
              <p>
                <span className="font-medium">Current cycle:</span>{' '}
                {policy.pastMonthLabel || policy.dueForMonth
                  ? `fee for ${policy.pastMonthLabel || new Date(policy.dueForMonth as string).toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
                  : '—'}
              </p>
              {policy.paidForCurrentCycle !== undefined && (
                <p>
                  Paid for this cycle:{' '}
                  <span
                    className={
                      policy.paidForCurrentCycle ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }
                  >
                    {policy.paidForCurrentCycle ? 'Yes' : 'No'}
                  </span>
                </p>
              )}
            </div>
          )}
          {data?.latestPackagePayment && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Latest package: {(data.latestPackagePayment as { packageName?: string }).packageName} — purchased{' '}
              {(data.latestPackagePayment as { purchasedAt?: string }).purchasedAt
                ? new Date((data.latestPackagePayment as { purchasedAt: string }).purchasedAt).toLocaleString()
                : '—'}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Fee for month (UTC)</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Recorded</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Reference</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.entries?.length ? (
                  data.entries.map((row) => (
                    <tr key={String(row.paymentId)} className="border-b border-gray-100 dark:border-gray-700/80">
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{row.feeForMonthLabel}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : row.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        ${Number(row.amount ?? 0).toFixed(2)} {row.currency}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all max-w-[140px]">
                          {row.transactionId || row.transactionHash || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {row.paymentId && (
                            <button
                              type="button"
                              onClick={() => copy(String(row.paymentId), 'Payment ID')}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Copy payment ID"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {row.status === 'pending' && row.paymentMethod === 'binance_wallet' && (
                            <button
                              type="button"
                              onClick={() => confirmPayment(String(row.paymentId))}
                              disabled={confirmingId === String(row.paymentId)}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                              title="Confirm payment"
                            >
                              {confirmingId === String(row.paymentId) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                      No monthly fee payments on file for this user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
