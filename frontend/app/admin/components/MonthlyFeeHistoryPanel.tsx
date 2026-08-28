'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Copy, CheckCircle, AlertCircle, RefreshCw, Unlock, CalendarRange } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import ReceiptDownloadButton from '../../../components/ReceiptDownloadButton';

export interface HistoryEntry {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  feeForMonthStart: string;
  feeForMonthLabel: string;
  feeDueByIso?: string | null;
  feeDueByLabel?: string | null;
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
  const [anchorMonth, setAnchorMonth] = useState('');
  const [reliefBusy, setReliefBusy] = useState<'unblock' | 'cancel' | 'anchor' | 'clearAnchor' | null>(null);

  const isoToMonthInput = (iso: string) => {
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

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

  useEffect(() => {
    const iso = data?.policy?.monthlyFeeBillingStartsMonthStart;
    if (typeof iso === 'string' && iso) {
      setAnchorMonth(isoToMonthInput(iso));
    } else {
      setAnchorMonth('');
    }
  }, [data?.policy?.monthlyFeeBillingStartsMonthStart]);

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
    reason?: string;
    adminImposedAccessBlock?: boolean;
    monthlyFeeBillingStartsMonthStart?: string | null;
    billingAnchorWaived?: boolean;
  };

  const showAdminRelief =
    policy &&
    policy.reason !== 'staff_exempt' &&
    policy.reason !== 'no_completed_package';

  const canSetBillingAnchor =
    !!showAdminRelief &&
    (policy.monthlyFeeEnabled !== false || !!policy.monthlyFeeBillingStartsMonthStart);

  const postRelief = async (
    relativePath: string,
    method: 'POST' | 'PUT',
    body: object,
    busy: typeof reliefBusy
  ) => {
    const token = localStorage.getItem('token');
    setReliefBusy(busy);
    try {
      const res = await fetch(buildApiUrl(relativePath), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((json as { error?: string }).error || 'Request failed', 'error');
        return;
      }
      showToast((json as { message?: string }).message || 'Saved', 'success');
      onConfirmed?.();
      await load();
    } finally {
      setReliefBusy(null);
    }
  };

  const handleUnblockAccessOnly = () =>
    postRelief(
      `api/admin/users/${userId}/monthly-fee-clear-access-block`,
      'POST',
      { cancelPending: false },
      'unblock'
    );

  const handleCancelBlockedPending = () =>
    postRelief(
      `api/admin/users/${userId}/monthly-fee-clear-access-block`,
      'POST',
      { cancelPending: true },
      'cancel'
    );

  const handleSaveBillingAnchor = () => {
    if (!anchorMonth || !/^\d{4}-\d{2}$/.test(anchorMonth)) {
      showToast('Choose a month (UTC)', 'error');
      return;
    }
    return postRelief(
      `api/admin/users/${userId}/monthly-fee-billing-anchor`,
      'PUT',
      { effectiveFromMonth: anchorMonth },
      'anchor'
    );
  };

  const handleClearBillingAnchor = () =>
    postRelief(
      `api/admin/users/${userId}/monthly-fee-billing-anchor`,
      'PUT',
      { clear: true },
      'clearAnchor'
    );

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
              {policy.monthlyFeeBillingStartsMonthStart && (
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                  Billing start (UTC):{' '}
                  {new Date(policy.monthlyFeeBillingStartsMonthStart).toLocaleString(undefined, {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC'
                  })}{' '}
                  {policy.billingAnchorWaived ? '— obligation for earlier months is waived.' : ''}
                </p>
              )}
            </div>
          )}

          {showAdminRelief && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/30 px-4 py-3 text-sm text-violet-950 dark:text-violet-100 space-y-3">
              <div className="flex items-center gap-2 font-medium text-violet-900 dark:text-violet-100">
                <Unlock className="w-4 h-4 shrink-0" />
                Admin: access &amp; billing
              </div>
              {policy.adminImposedAccessBlock && (
                <div className="space-y-2">
                  <p className="text-xs text-violet-800 dark:text-violet-200 leading-snug">
                    This user is blocked until an admin-imposed monthly fee is paid. You can lift the block (they keep a
                    pending fee) or cancel that pending fee entirely.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reliefBusy !== null}
                      onClick={() => void handleUnblockAccessOnly()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {reliefBusy === 'unblock' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Unblock access (keep fee)
                    </button>
                    <button
                      type="button"
                      disabled={reliefBusy !== null}
                      onClick={() => void handleCancelBlockedPending()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-400 text-violet-900 dark:text-violet-100 dark:border-violet-500 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 disabled:opacity-50"
                    >
                      {reliefBusy === 'cancel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Cancel pending fee
                    </button>
                  </div>
                </div>
              )}

              {canSetBillingAnchor && (
                <div className="pt-1 border-t border-violet-200/80 dark:border-violet-700/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-violet-900 dark:text-violet-100">
                    <CalendarRange className="w-4 h-4 shrink-0" />
                    Recurring fee starts (UTC month)
                  </div>
                  <p className="text-[11px] text-violet-800 dark:text-violet-200 leading-snug">
                    Obligation applies only for fee months on or after this month (extends or resets the cycle). Uses the
                    same UTC calendar rules as the rest of monthly billing.
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-0.5 text-[11px] text-violet-800 dark:text-violet-300">
                      <span>First billing month</span>
                      <input
                        type="month"
                        value={anchorMonth}
                        onChange={(e) => setAnchorMonth(e.target.value)}
                        className="rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={reliefBusy !== null}
                      onClick={() => void handleSaveBillingAnchor()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {reliefBusy === 'anchor' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={reliefBusy !== null || !policy.monthlyFeeBillingStartsMonthStart}
                      onClick={() => void handleClearBillingAnchor()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-400 text-violet-900 dark:text-violet-100 dark:border-violet-500 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 disabled:opacity-50"
                    >
                      {reliefBusy === 'clearAnchor' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Clear
                    </button>
                  </div>
                </div>
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
                      <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">
                        {row.feeForMonthLabel}
                        {row.feeDueByLabel ? (
                          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                            Pay by {row.feeDueByLabel} UTC
                          </span>
                        ) : null}
                      </td>
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
                          {row.paymentId && row.status === 'completed' && (
                            <ReceiptDownloadButton
                              endpoint={`api/admin/users/${userId}/receipts/${row.paymentId}`}
                              filename="Forex-Navigators-monthly-fee-receipt.pdf"
                              iconOnly
                              title="Download receipt"
                              className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50"
                            />
                          )}
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
