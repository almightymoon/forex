'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildApiUrl } from '@/utils/api';
import { hasMonthlyFeeAccessLock } from '@/utils/monthlyFeeAccessLock';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import {
  CalendarClock,
  Wallet,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield
} from 'lucide-react';

type Policy = Record<string, unknown> & {
  found?: boolean;
  monthlyFeeEnabled?: boolean;
  paidForCurrentCycle?: boolean;
  reason?: string;
  applies?: boolean;
  packageName?: string;
  monthlyFeeAmount?: number;
  graceDays?: number;
  withinGracePeriod?: boolean;
  withinFullFreeWindow?: boolean;
  requiredMonthWaived?: boolean;
  dueForMonth?: string;
  daysOverdue?: number;
  isAccessBlocked?: boolean;
  /** Admin-imposed pending fee with platform hold — same as auth middleware. */
  adminImposedAccessBlock?: boolean;
};

type HistoryEntry = {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  feeForMonthLabel: string;
  feeForMonthStart?: string;
  transactionId?: string | null;
  paymentScreenshotUrl?: string | null;
};

type PendingPayment = {
  _id: string;
  finalAmount?: number;
  amount?: number;
  paymentScreenshotUrl?: string;
  status?: string;
};

type CycleSummary = {
  dueMonthIso: string | null;
  dueMonthLabel: string | null;
  amountUsd: number | null;
  graceDays?: number;
  withinGracePeriod: boolean;
  withinFullFreeWindow: boolean;
  requiredMonthWaived: boolean;
  daysOverdue: number;
  isAccessBlocked: boolean;
  paidForCurrentCycle: boolean;
  obligation:
    | 'not_applicable'
    | 'paid'
    | 'awaiting_admin'
    | 'portal_open'
    | 'waived_or_free_window'
    | 'payment_needed';
  pendingPaymentCount: number;
};

type SummaryResponse = {
  policy: Policy;
  entries: HistoryEntry[];
  pendingPayment: PendingPayment | null;
  cycleSummary?: CycleSummary;
  pendingRows?: HistoryEntry[];
};

function formatUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

export default function MonthlyFeePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [cycleSummary, setCycleSummary] = useState<CycleSummary | null>(null);
  const [pendingRows, setPendingRows] = useState<HistoryEntry[]>([]);
  const [creating, setCreating] = useState(false);

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : null), []);

  const goToPayment = useCallback((paymentId: string, amountUsd?: number | null) => {
    const q = new URLSearchParams();
    q.set('paymentId', paymentId);
    q.set('type', 'monthly_fee');
    if (amountUsd != null && Number.isFinite(Number(amountUsd))) {
      q.set('amount', String(amountUsd));
    }
    router.push(`/payment?${q.toString()}`);
  }, [router]);

  const loadSummary = useCallback(async () => {
    const res = await fetch(buildApiUrl('api/payments/monthly-fee'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = (await res.json().catch(() => ({}))) as SummaryResponse & { error?: string; message?: string };
    if (!res.ok) {
      const msg = data.message || data.error || 'Failed to load monthly fee';
      throw new Error(msg);
    }
    return data;
  }, [token]);

  const refresh = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      if (!token) {
        router.push('/login');
        return;
      }
      const data = await loadSummary();
      const pol = data.policy || {};

      if (pol.found === false) {
        router.push('/dashboard');
        return;
      }

      if (pol.reason === 'no_completed_package') {
        router.push('/select-package');
        return;
      }

      setPolicy(pol);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setPendingPayment(data.pendingPayment || null);
      setCycleSummary(data.cycleSummary ?? null);
      setPendingRows(Array.isArray(data.pendingRows) ? data.pendingRows : []);

      // Do not redirect when the current cycle is already paid (or not applicable). Students should
      // stay on this page to see history, receipts, and status instead of being bounced to the dashboard.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly fee screen');
    } finally {
      setIsLoading(false);
    }
  }, [loadSummary, router, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ensurePendingAndPay = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('api/payments/monthly-fee'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (
          (data as { message?: string }).message?.includes('not require') ||
          (data as { error?: string }).error === 'Monthly fee not applicable'
        ) {
          router.push('/dashboard');
          return;
        }
        setError(
          (data as { message?: string }).message || (data as { error?: string }).error || 'Could not start payment'
        );
        return;
      }
      const pay = (data as { payment?: { _id: string; finalAmount?: number; amount?: number } }).payment;
      if (pay?._id) {
        goToPayment(String(pay._id), pay.finalAmount ?? pay.amount);
        return;
      }
      const refreshed = await loadSummary();
      if (refreshed.pendingPayment?._id) {
        const pp = refreshed.pendingPayment;
        goToPayment(String(pp._id), pp.finalAmount ?? pp.amount ?? refreshed.cycleSummary?.amountUsd);
      }
    } catch {
      setError('Could not start payment');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return <CoolLoader message="Loading monthly fee…" />;
  }

  const pendingSubmitted = !!(pendingPayment?.paymentScreenshotUrl);

  const obligationResolved: CycleSummary['obligation'] =
    cycleSummary?.obligation ??
    (policy?.applies === false || policy?.reason === 'staff_exempt'
      ? 'not_applicable'
      : policy?.adminImposedAccessBlock
        ? pendingSubmitted
          ? 'awaiting_admin'
          : pendingPayment
            ? 'portal_open'
            : 'payment_needed'
        : policy?.monthlyFeeEnabled === false
          ? 'not_applicable'
          : policy?.paidForCurrentCycle
            ? 'paid'
            : pendingSubmitted
              ? 'awaiting_admin'
              : pendingPayment
                ? 'portal_open'
                : policy?.withinFullFreeWindow || policy?.requiredMonthWaived
                  ? 'waived_or_free_window'
                  : 'payment_needed');

  const dueLabel =
    cycleSummary?.dueMonthLabel ||
    (policy?.dueForMonth
      ? new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC'
        }).format(new Date(String(policy.dueForMonth)))
      : 'Current cycle (UTC)');

  const amountDisplay =
    cycleSummary?.amountUsd ?? (typeof policy?.monthlyFeeAmount === 'number' ? policy.monthlyFeeAmount : null);
  const graceDays = cycleSummary?.graceDays ?? policy?.graceDays ?? 3;
  const inGrace = cycleSummary?.withinGracePeriod ?? policy?.withinGracePeriod;
  const daysOver = cycleSummary?.daysOverdue ?? policy?.daysOverdue ?? 0;
  const blocked = cycleSummary?.isAccessBlocked ?? policy?.isAccessBlocked;
  const inFreeWindow = cycleSummary?.withinFullFreeWindow ?? policy?.withinFullFreeWindow;

  const showWaived =
    obligationResolved === 'waived_or_free_window' ||
    (inFreeWindow && obligationResolved !== 'portal_open' && obligationResolved !== 'awaiting_admin');

  const mayLeaveToDashboard =
    !policy?.adminImposedAccessBlock &&
    !hasMonthlyFeeAccessLock() &&
    (policy?.reason === 'staff_exempt' ||
      showWaived ||
      obligationResolved === 'paid' ||
      obligationResolved === 'not_applicable');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
              Billing
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Monthly fee</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              Same secure flow as your package payment: USDT (TRC20), transaction hash, your details, and a screenshot for
              admin review.
            </p>
          </div>
          <DarkModeToggle size="sm" />
        </header>

        {policy?.adminImposedAccessBlock && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-semibold">Administrator billing hold</p>
            <p className="mt-1">
              Your account can use this page and the payment portal until this fee is completed. The rest of the
              platform stays locked.
            </p>
          </div>
        )}

        {(policy?.reason === 'staff_exempt' ||
          (policy?.monthlyFeeEnabled === false && !policy?.adminImposedAccessBlock)) && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200">
            {policy?.reason === 'staff_exempt' ? (
              <p>Staff and instructor accounts are not charged a student monthly fee.</p>
            ) : (
              <p>Your current package does not require a recurring monthly fee.</p>
            )}
            {mayLeaveToDashboard && (
              <Link
                href="/dashboard"
                className="inline-block mt-3 text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                Back to dashboard
              </Link>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            {/* Current cycle */}
            <section className="rounded-3xl bg-white dark:bg-gray-900 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-800 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                <div className="flex items-center gap-2 text-violet-100 text-sm font-medium">
                  <CalendarClock className="w-4 h-4" />
                  Fee for calendar month (UTC)
                </div>
                <h2 className="mt-1 text-2xl font-bold">{dueLabel}</h2>
                <p className="mt-1 text-sm text-violet-100/90">
                  This is the month your payment counts toward — aligned with platform access rules.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-gray-800 px-3 py-1 text-sm font-semibold text-slate-800 dark:text-gray-100">
                    <Wallet className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    {formatUsd(amountDisplay)} <span className="font-normal text-slate-500 dark:text-gray-400">/ month</span>
                  </span>
                  {policy?.packageName && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Package: <span className="font-medium text-gray-900 dark:text-gray-200">{policy.packageName}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {showWaived && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      Free period or waived — no payment due for this cycle
                    </span>
                  )}
                  {inGrace && !showWaived && obligationResolved !== 'paid' && obligationResolved !== 'not_applicable' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-3 py-1 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Grace period (day 1–{graceDays} UTC): access continues; pay anytime
                    </span>
                  )}
                  {blocked && daysOver > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 px-3 py-1 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Past grace — pay to restore access
                    </span>
                  )}
                  {obligationResolved === 'awaiting_admin' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-3 py-1 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Proof submitted — waiting for admin
                    </span>
                  )}
                  {obligationResolved === 'paid' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100 px-3 py-1 text-xs font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      This cycle is paid
                    </span>
                  )}
                </div>

                {obligationResolved === 'paid' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are up to date for this billing cycle. You can still review your history on the right. When the
                    next fee is due, a pay option will appear here again.
                  </p>
                )}

                {!showWaived && obligationResolved !== 'paid' && obligationResolved !== 'not_applicable' && (
                  <div className="rounded-2xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/25 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-violet-600" />
                      Payment portal
                    </h3>
                    {pendingSubmitted ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Your screenshot is on file. An admin will confirm your USDT payment; you will get access again right
                        after approval.
                      </p>
                    ) : pendingPayment?._id ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          You already have an open payment. Continue to the portal to send USDT and submit your hash,
                          details, and proof.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            goToPayment(
                              String(pendingPayment._id),
                              pendingPayment.finalAmount ?? pendingPayment.amount ?? amountDisplay
                            )
                          }
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
                        >
                          Open payment portal
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Create a secure payment record, then go straight to the same portal you used for signup.
                        </p>
                        <button
                          type="button"
                          onClick={() => ensurePendingAndPay()}
                          disabled={creating}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all disabled:opacity-60"
                        >
                          {creating ? 'Opening portal…' : 'Pay & open portal'}
                          {!creating && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Pending month rows (from records) */}
            {pendingRows.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Pending payment records
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Each row is a monthly-fee payment that is not completed yet. Use the portal to finish or track status.
                </p>
                <ul className="space-y-3">
                  {pendingRows.map((row) => {
                    const hasProof = !!row.paymentScreenshotUrl;
                    const isActive = pendingPayment && String(pendingPayment._id) === String(row.paymentId);
                    return (
                      <li
                        key={String(row.paymentId)}
                        className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                          isActive
                            ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20'
                            : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/15'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{row.feeForMonthLabel}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {formatUsd(row.amount)} {row.currency || 'USD'}
                            {isActive && (
                              <span className="ml-2 text-violet-600 dark:text-violet-400 font-medium">· Current open payment</span>
                            )}
                          </p>
                          <p className="text-xs mt-1 text-amber-800 dark:text-amber-200/90">
                            {hasProof ? 'Submitted — awaiting admin confirmation' : 'Action needed — open portal to submit proof'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToPayment(String(row.paymentId), row.amount ?? amountDisplay)}
                          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90"
                        >
                          Open portal
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          {/* History sidebar */}
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-slate-200 dark:border-gray-800 p-5 shadow-lg">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-violet-500" />
                Full history
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                All monthly fee records, newest first. &quot;Fee for month&quot; uses UTC calendar months.
              </p>
              <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {entries.length === 0 ? (
                  <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No monthly fee payments yet.</p>
                ) : (
                  entries.map((row) => (
                    <div key={String(row.paymentId)} className="p-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{row.feeForMonthLabel}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(row.createdAt).toLocaleDateString(undefined, {
                              dateStyle: 'medium'
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-md ${
                            row.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : row.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {formatUsd(row.amount)} {row.currency || 'USD'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {mayLeaveToDashboard && (
              <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                <Link href="/dashboard" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                  Back to dashboard
                </Link>
                {' — '}
                full access returns after your fee is confirmed.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
