'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { buildApiUrl } from '@/utils/api';
import { hasMonthlyFeeAccessLock } from '@/utils/monthlyFeeAccessLock';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import ReceiptDownloadButton from '../../components/ReceiptDownloadButton';
import UserProfileDropdown from '../components/UserProfileDropdown';
import { useDashboard } from '../../context/DashboardContext';
import { useSettings } from '../../context/SettingsContext';
import {
  CalendarClock,
  Wallet,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
} from 'lucide-react';
import './monthly-fee.css';

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

function historyStatusClass(status: string) {
  if (status === 'completed') return 'mfee-history__status--completed';
  if (status === 'pending') return 'mfee-history__status--pending';
  return 'mfee-history__status--other';
}

export default function MonthlyFeePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { data: { user }, refreshUser } = useDashboard();
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
      headers: { Authorization: `Bearer ${token}` },
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly fee screen');
    } finally {
      setIsLoading(false);
    }
  }, [loadSummary, router, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const profileUser = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        balance: user.balance,
      }
    : null;

  const ensurePendingAndPay = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('api/payments/monthly-fee'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
          (data as { message?: string }).message || (data as { error?: string }).error || 'Could not start payment',
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

  const pendingSubmitted = !!pendingPayment?.paymentScreenshotUrl;

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
          timeZone: 'UTC',
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
    <div className="mfee-page">
      <header className="mfee-page__header">
        <div className="mfee-page__header-inner">
          <Link
            href={mayLeaveToDashboard ? '/dashboard' : '/monthly-fee'}
            className="mfee-page__brand"
            aria-label={mayLeaveToDashboard ? 'Back to dashboard' : 'Monthly fee home'}
          >
            <img src="/all-07.svg" alt={`${settings.platformName} logo`} />
            <span>{settings.platformName}</span>
          </Link>
          <div className="mfee-page__header-actions">
            <DarkModeToggle size="sm" />
            <UserProfileDropdown user={profileUser} />
          </div>
        </div>
      </header>

      <main className="mfee-page__main">
        <motion.header
          className="mfee-intro"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="mfee-intro__eyebrow">Billing</p>
          <h1 className="mfee-intro__title">Monthly fee</h1>
          <p className="mfee-intro__desc">
            Same secure flow as your package payment: USDT (TRC20), transaction hash, your details, and a screenshot for
            admin review.
          </p>
        </motion.header>

        {policy?.adminImposedAccessBlock && (
          <motion.div
            className="mfee-alert mfee-alert--amber"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <p className="mfee-alert__title">Administrator billing hold</p>
            <p>
              Your account can use this page and the payment portal until this fee is completed. The rest of the
              platform stays locked.
            </p>
          </motion.div>
        )}

        {(policy?.reason === 'staff_exempt' ||
          (policy?.monthlyFeeEnabled === false && !policy?.adminImposedAccessBlock)) && (
          <motion.div
            className="mfee-alert mfee-alert--muted"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {policy?.reason === 'staff_exempt' ? (
              <p>Staff and instructor accounts are not charged a student monthly fee.</p>
            ) : (
              <p>Your current package does not require a recurring monthly fee.</p>
            )}
            {mayLeaveToDashboard && (
              <Link href="/dashboard" className="mfee-alert__link">
                Back to dashboard
              </Link>
            )}
          </motion.div>
        )}

        {error && (
          <div className="mfee-alert mfee-alert--error">
            <p>{error}</p>
            <button type="button" onClick={() => refresh()} className="mfee-btn-retry">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        <div className="mfee-grid">
          <div className="mfee-col-main">
            <motion.section
              className="mfee-cycle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <div className="mfee-cycle__hero">
                <div className="mfee-cycle__hero-inner">
                  <div className="mfee-cycle__hero-label">
                    <CalendarClock className="w-4 h-4" />
                    Fee for calendar month (UTC)
                  </div>
                  <h2 className="mfee-cycle__hero-title">{dueLabel}</h2>
                  <p className="mfee-cycle__hero-desc">
                    This is the month your payment counts toward — aligned with platform access rules.
                  </p>
                </div>
              </div>

              <div className="mfee-cycle__body">
                <div className="mfee-cycle__meta">
                  <span className="mfee-amount-pill">
                    <Wallet className="w-4 h-4" style={{ color: 'var(--mfee-accent)' }} />
                    {formatUsd(amountDisplay)} <span>/ month</span>
                  </span>
                  {policy?.packageName && (
                    <span className="mfee-package-label">
                      Package: <strong>{policy.packageName}</strong>
                    </span>
                  )}
                </div>

                <div className="mfee-chips">
                  {showWaived && (
                    <span className="mfee-chip mfee-chip--emerald">
                      <Shield className="w-3.5 h-3.5" />
                      Free period or waived — no payment due for this cycle
                    </span>
                  )}
                  {inGrace && !showWaived && obligationResolved !== 'paid' && obligationResolved !== 'not_applicable' && (
                    <span className="mfee-chip mfee-chip--amber">
                      <Clock className="w-3.5 h-3.5" />
                      Grace period (day 1–{graceDays} UTC): access continues; pay anytime
                    </span>
                  )}
                  {blocked && daysOver > 0 && (
                    <span className="mfee-chip mfee-chip--red">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Past grace — pay to restore access
                    </span>
                  )}
                  {obligationResolved === 'awaiting_admin' && (
                    <span className="mfee-chip mfee-chip--blue">
                      <Clock className="w-3.5 h-3.5" />
                      Proof submitted — waiting for admin
                    </span>
                  )}
                  {obligationResolved === 'paid' && (
                    <span className="mfee-chip mfee-chip--green">
                      <CheckCircle className="w-3.5 h-3.5" />
                      This cycle is paid
                    </span>
                  )}
                </div>

                {obligationResolved === 'paid' && (
                  <p className="mfee-cycle__note">
                    You are up to date for this billing cycle. You can still review your history on the right. When the
                    next fee is due, a pay option will appear here again.
                  </p>
                )}

                {!showWaived && obligationResolved !== 'paid' && obligationResolved !== 'not_applicable' && (
                  <div className="mfee-portal">
                    <h3 className="mfee-portal__title">
                      <ExternalLink className="w-4 h-4" />
                      Payment portal
                    </h3>
                    {pendingSubmitted ? (
                      <p className="mfee-portal__text">
                        Your screenshot is on file. An admin will confirm your USDT payment; you will get access again
                        right after approval.
                      </p>
                    ) : pendingPayment?._id ? (
                      <div className="mfee-portal__actions">
                        <p className="mfee-portal__text">
                          You already have an open payment. Continue to the portal to send USDT and submit your hash,
                          details, and proof.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            goToPayment(
                              String(pendingPayment._id),
                              pendingPayment.finalAmount ?? pendingPayment.amount ?? amountDisplay,
                            )
                          }
                          className="mfee-btn-primary"
                        >
                          Open payment portal
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="mfee-portal__actions">
                        <p className="mfee-portal__text">
                          Create a secure payment record, then go straight to the same portal you used for signup.
                        </p>
                        <button
                          type="button"
                          onClick={() => ensurePendingAndPay()}
                          disabled={creating}
                          className="mfee-btn-primary"
                        >
                          {creating ? 'Opening portal…' : 'Pay & open portal'}
                          {!creating && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>

            {pendingRows.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <h2 className="mfee-pending-section__title">
                  <Clock className="w-5 h-5" />
                  Pending payment records
                </h2>
                <p className="mfee-pending-section__desc">
                  Each row is a monthly-fee payment that is not completed yet. Use the portal to finish or track status.
                </p>
                <ul className="mfee-pending-list">
                  {pendingRows.map((row) => {
                    const hasProof = !!row.paymentScreenshotUrl;
                    const isActive = pendingPayment && String(pendingPayment._id) === String(row.paymentId);
                    return (
                      <li
                        key={String(row.paymentId)}
                        className={`mfee-pending-item ${isActive ? 'mfee-pending-item--active' : 'mfee-pending-item--default'}`}
                      >
                        <div>
                          <p className="mfee-pending-item__title">{row.feeForMonthLabel}</p>
                          <p className="mfee-pending-item__meta">
                            {formatUsd(row.amount)} {row.currency || 'USD'}
                            {isActive && <span className="is-active">· Current open payment</span>}
                          </p>
                          <p className="mfee-pending-item__status">
                            {hasProof ? 'Submitted — awaiting admin confirmation' : 'Action needed — open portal to submit proof'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => goToPayment(String(row.paymentId), row.amount ?? amountDisplay)}
                          className="mfee-btn-secondary"
                        >
                          Open portal
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            )}
          </div>

          <aside className="mfee-col-aside">
            <motion.div
              className="mfee-history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="mfee-history__title">
                <CalendarClock className="w-4 h-4" />
                Full history
              </h2>
              <p className="mfee-history__desc">
                All monthly fee records, newest first. &quot;Fee for month&quot; uses UTC calendar months.
              </p>
              <div className="mfee-history__list">
                {entries.length === 0 ? (
                  <p className="mfee-history__empty">No monthly fee payments yet.</p>
                ) : (
                  entries.map((row) => (
                    <div key={String(row.paymentId)} className="mfee-history__row">
                      <div className="mfee-history__row-head">
                        <div>
                          <p className="mfee-history__row-title">{row.feeForMonthLabel}</p>
                          <p className="mfee-history__row-date">
                            {new Date(row.createdAt).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </p>
                        </div>
                        <span className={`mfee-history__status ${historyStatusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </div>
                      <p className="mfee-history__amount">
                        {formatUsd(row.amount)} {row.currency || 'USD'}
                      </p>
                      {row.status === 'completed' && row.paymentId ? (
                        <div className="mfee-history__receipt">
                          <ReceiptDownloadButton
                            endpoint={`api/payments/${row.paymentId}/receipt`}
                            filename="Forex-Navigators-monthly-fee-receipt.pdf"
                            label="Receipt"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {mayLeaveToDashboard && (
              <p className="mfee-footer-note">
                <Link href="/dashboard">Back to dashboard</Link>
                {' — '}
                full access returns after your fee is confirmed.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
