'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Eye,
  History,
  Loader2,
  Mail,
  Search,
  Sparkles,
  UserCircle,
  Unlock,
  CalendarRange
} from 'lucide-react';
import AdminRowActionsMenu from './AdminRowActionsMenu';

/** Due month ISO (UTC) → YYYY-MM of the following UTC month (billing anchor that waives the due month). */
function nextUtcMonthYYYYMM(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const next = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
    const Y = next.getUTCFullYear();
    const Mo = String(next.getUTCMonth() + 1).padStart(2, '0');
    return `${Y}-${Mo}`;
  } catch {
    return null;
  }
}

function formatUtcDateLabel(iso?: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return '—';
  }
}
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { Payment, User } from './types';
import UserDetailsModal from './UserDetailsModal';
import MonthlyFeeHistoryModal from './MonthlyFeeHistoryModal';
import MonthlyFeeBillingDirectoryPanel from './MonthlyFeeBillingDirectoryPanel';

interface Props {
  payments: Payment[];
  onRefresh?: () => void;
}

export default function MonthlyFeeManagement({ payments, onRefresh }: Props) {
  const [view, setView] = useState<'payments' | 'overdue' | 'directory'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [overdueError, setOverdueError] = useState('');
  const [overdueUsers, setOverdueUsers] = useState<any[]>([]);
  const [overdueMeta, setOverdueMeta] = useState<{
    note?: string;
    dueForMonth?: string;
    pastMonthLabel?: string;
    asOf?: string;
  }>({});
  const [pendingStatusFilter, setPendingStatusFilter] = useState<
    'all' | 'in_grace' | 'overdue' | 'pending_confirmation' | 'no_fee_required'
  >('all');
  const [pendingPackageFilter, setPendingPackageFilter] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingLastPaidFilter, setPendingLastPaidFilter] = useState<
    'all' | 'never' | '90d' | 'older'
  >('all');
  const [hideNoFeeRows, setHideNoFeeRows] = useState(true);
  const [packageOptions, setPackageOptions] = useState<{ name: string }[]>([]);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; label: string } | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [openingProfileId, setOpeningProfileId] = useState<string | null>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(() => new Set());
  const [bulkAnchorMonth, setBulkAnchorMonth] = useState('');
  const [bulkBusy, setBulkBusy] = useState<'anchor' | 'clear' | 'unblock' | 'invoice' | null>(null);
  const [rowBusyKey, setRowBusyKey] = useState<string | null>(null);

  const loadOverdueUsers = useCallback(async () => {
    try {
      setOverdueLoading(true);
      setOverdueError('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (pendingStatusFilter !== 'all') params.set('status', pendingStatusFilter);
      if (pendingPackageFilter.trim()) params.set('packageName', pendingPackageFilter.trim());
      const res = await fetch(buildApiUrl(`api/admin/monthly-fee/overdue?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOverdueError(data?.error || 'Failed to load pending fee students');
        setOverdueUsers([]);
        setOverdueMeta({});
        return;
      }
      setOverdueUsers(Array.isArray(data?.users) ? data.users : []);
      setOverdueMeta({
        note: typeof data?.note === 'string' ? data.note : undefined,
        dueForMonth: typeof data?.dueForMonth === 'string' ? data.dueForMonth : undefined,
        pastMonthLabel: typeof data?.pastMonthLabel === 'string' ? data.pastMonthLabel : undefined,
        asOf: typeof data?.asOf === 'string' ? data.asOf : undefined
      });
    } catch {
      setOverdueError('Failed to load pending fee students');
      setOverdueUsers([]);
      setOverdueMeta({});
    } finally {
      setOverdueLoading(false);
    }
  }, [pendingStatusFilter, pendingPackageFilter]);

  useEffect(() => {
    if (view !== 'overdue' && view !== 'directory') return;
    const loadPkgs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(buildApiUrl('api/admin/packages'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => []);
        if (res.ok && Array.isArray(data)) {
          setPackageOptions(data.map((p: any) => ({ name: p.name })).filter((p: any) => p.name));
        }
      } catch {
        /* ignore */
      }
    };
    loadPkgs();
  }, [view]);

  const billingAssistant = useMemo(() => {
    const byStatus = {
      overdue: 0,
      in_grace: 0,
      pending_confirmation: 0,
      no_fee_required: 0,
    };
    const byPackage = new Map<string, number>();
    let amountDue = 0;
    let neverPaid = 0;
    for (const row of overdueUsers) {
      const st = String(row.feeStatus || '');
      if (st in byStatus) byStatus[st as keyof typeof byStatus] += 1;
      const pkg = String(row.packageName || 'Unknown');
      byPackage.set(pkg, (byPackage.get(pkg) || 0) + 1);
      if (st !== 'no_fee_required') {
        amountDue += Number(row.amountPending ?? row.monthlyFeeAmount ?? 0) || 0;
        if (!row.lastPaidAt) neverPaid += 1;
      }
    }
    const packageBreakdown = [...byPackage.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    return {
      total: overdueUsers.length,
      ...byStatus,
      amountDue,
      neverPaid,
      packageBreakdown,
      needsAttention: byStatus.overdue + byStatus.pending_confirmation,
    };
  }, [overdueUsers]);

  const filteredPendingRows = useMemo(() => {
    const q = pendingSearch.toLowerCase().trim();
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    return overdueUsers.filter((row: any) => {
      if (hideNoFeeRows && row.feeStatus === 'no_fee_required') return false;

      if (q) {
        const u = row.user;
        const blob = `${u?.firstName || ''} ${u?.lastName || ''} ${u?.email || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }

      if (pendingLastPaidFilter === 'never' && row.lastPaidAt) return false;
      if (pendingLastPaidFilter === '90d') {
        if (!row.lastPaidAt) return false;
        const t = new Date(row.lastPaidAt).getTime();
        if (Number.isNaN(t) || now - t > ninetyDaysMs) return false;
      }
      if (pendingLastPaidFilter === 'older') {
        if (!row.lastPaidAt) return true;
        const t = new Date(row.lastPaidAt).getTime();
        if (Number.isNaN(t) || now - t <= ninetyDaysMs) return false;
      }

      return true;
    });
  }, [overdueUsers, pendingSearch, pendingLastPaidFilter, hideNoFeeRows]);

  const monthlyFeePayments = useMemo(() => {
    const only = (payments || []).filter((p: any) => p?.type === 'monthly_fee');
    const term = searchTerm.toLowerCase().trim();
    return only
      .filter((p) => {
        const matchesSearch =
          !term ||
          p._id.toLowerCase().includes(term) ||
          (p.user?.firstName?.toLowerCase().includes(term) || false) ||
          (p.user?.lastName?.toLowerCase().includes(term) || false) ||
          (p.user?.email?.toLowerCase().includes(term) || false) ||
          (p.transactionId?.toLowerCase().includes(term) || false) ||
          (p.binanceWallet?.transactionHash?.toLowerCase().includes(term) || false);

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, searchTerm, statusFilter]);

  const openUserProfile = async (userId: string) => {
    setOpeningProfileId(userId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${userId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string })?.error || 'Failed to load user', 'error');
        return;
      }
      setProfileUser(data as User);
    } catch {
      showToast('Failed to load user', 'error');
    } finally {
      setOpeningProfileId(null);
    }
  };

  const confirmPayment = async (paymentId: string) => {
    const token = localStorage.getItem('token');
    setConfirmingPaymentId(paymentId);
    try {
      const response = await fetch(buildApiUrl(`api/payments/admin/confirm`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId })
      });
      if (response.ok) {
        showToast('Monthly fee confirmed!', 'success');
        onRefresh?.();
        if (view === 'overdue') loadOverdueUsers();
      } else {
        const data = await response.json().catch(() => ({}));
        showToast(data?.error || 'Failed to confirm monthly fee', 'error');
      }
    } catch {
      showToast('Error confirming monthly fee', 'error');
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  useEffect(() => {
    if (view !== 'overdue') return;
    loadOverdueUsers();
  }, [view, loadOverdueUsers]);

  useEffect(() => {
    if (overdueMeta.dueForMonth && typeof overdueMeta.dueForMonth === 'string') {
      const ym = overdueMeta.dueForMonth.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) setBulkAnchorMonth(ym);
    }
  }, [overdueMeta.dueForMonth]);

  useEffect(() => {
    const valid = new Set(
      overdueUsers
        .map((r: { user?: { _id?: string } }) => (r.user?._id ? String(r.user._id) : ''))
        .filter(Boolean)
    );
    setSelectedPendingIds((prev) => new Set([...prev].filter((id) => valid.has(id))));
  }, [overdueUsers]);

  const selectablePendingIds = useMemo(
    () =>
      filteredPendingRows
        .map((r: { user?: { _id?: string } }) => (r.user?._id ? String(r.user._id) : ''))
        .filter(Boolean),
    [filteredPendingRows]
  );

  const allVisibleSelected =
    selectablePendingIds.length > 0 &&
    selectablePendingIds.every((id) => selectedPendingIds.has(id));

  const togglePendingRowSelected = (id: string) => {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisiblePending = () => {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        selectablePendingIds.forEach((id) => next.delete(id));
      } else {
        selectablePendingIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const runBulkPutAnchor = async (month: string) => {
    const ids = [...selectedPendingIds];
    if (!ids.length) {
      showToast('Select at least one user', 'error');
      return;
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      showToast('Choose a valid month (YYYY-MM, UTC)', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    setBulkBusy('anchor');
    let ok = 0;
    let fail = 0;
    try {
      for (const id of ids) {
        try {
          const res = await fetch(buildApiUrl(`api/admin/users/${id}/monthly-fee-billing-anchor`), {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ effectiveFromMonth: month })
          });
          if (res.ok) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      showToast(
        fail ? `Billing start set for ${ok} user(s), ${fail} failed.` : `Billing start set for ${ok} user(s).`,
        fail && !ok ? 'error' : 'success'
      );
      setSelectedPendingIds(new Set());
      await loadOverdueUsers();
    } finally {
      setBulkBusy(null);
    }
  };

  const runBulkClearAnchors = async () => {
    const ids = [...selectedPendingIds];
    if (!ids.length) {
      showToast('Select at least one user', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    setBulkBusy('clear');
    let ok = 0;
    let fail = 0;
    try {
      for (const id of ids) {
        try {
          const res = await fetch(buildApiUrl(`api/admin/users/${id}/monthly-fee-billing-anchor`), {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clear: true })
          });
          if (res.ok) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      showToast(
        fail ? `Cleared anchor for ${ok} user(s), ${fail} failed.` : `Cleared billing anchor for ${ok} user(s).`,
        fail && !ok ? 'error' : 'success'
      );
      setSelectedPendingIds(new Set());
      await loadOverdueUsers();
    } finally {
      setBulkBusy(null);
    }
  };

  const runBulkUnblockAccess = async () => {
    const ids = [...selectedPendingIds];
    if (!ids.length) {
      showToast('Select at least one user', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    setBulkBusy('unblock');
    let ok = 0;
    let skip = 0;
    try {
      for (const id of ids) {
        try {
          const res = await fetch(buildApiUrl(`api/admin/users/${id}/monthly-fee-clear-access-block`), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cancelPending: false })
          });
          if (res.ok) ok += 1;
          else skip += 1;
        } catch {
          skip += 1;
        }
      }
      showToast(
        ok
          ? `Removed access block for ${ok} user(s)${skip ? ` (${skip} had no admin block).` : '.'}`
          : `No admin access blocks matched (${skip} user(s)).`,
        ok ? 'success' : 'error'
      );
      setSelectedPendingIds(new Set());
      await loadOverdueUsers();
    } finally {
      setBulkBusy(null);
    }
  };

  const sendInvoiceOne = async (userId: string) => {
    setRowBusyKey(`${userId}:invoice`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/monthly-fee/send-invoice'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Could not send invoice', 'error');
        return;
      }
      showToast(data?.message || 'Invoice sent', 'success');
    } catch {
      showToast('Failed to send invoice', 'error');
    } finally {
      setRowBusyKey(null);
    }
  };

  const runBulkSendInvoices = async () => {
    const ids = [...selectedPendingIds];
    if (!ids.length) {
      showToast('Select at least one user', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    setBulkBusy('invoice');
    try {
      const res = await fetch(buildApiUrl('api/admin/monthly-fee/send-invoice-bulk'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to send invoices', 'error');
        return;
      }
      const succeeded = Number(data?.summary?.succeeded ?? 0);
      const failed = Number(data?.summary?.failed ?? 0);
      showToast(
        failed
          ? `Invoices sent to ${succeeded} student(s), ${failed} failed.`
          : `Invoices sent to ${succeeded} student(s).`,
        failed && !succeeded ? 'error' : 'success'
      );
      setSelectedPendingIds(new Set());
    } catch {
      showToast('Failed to send invoices', 'error');
    } finally {
      setBulkBusy(null);
    }
  };

  const putBillingAnchorForUser = async (userId: string, effectiveFromMonth: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(buildApiUrl(`api/admin/users/${userId}/monthly-fee-billing-anchor`), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ effectiveFromMonth })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error || 'Request failed', 'error');
      return false;
    }
    showToast((data as { message?: string }).message || 'Saved', 'success');
    return true;
  };

  const postClearAccessBlock = async (userId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(buildApiUrl(`api/admin/users/${userId}/monthly-fee-clear-access-block`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cancelPending: false })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast((data as { error?: string }).error || 'No admin block on this user', 'error');
      return false;
    }
    showToast((data as { message?: string }).message || 'Unblocked', 'success');
    return true;
  };

  const handleRowExtendFromDue = async (uid: string, dueForMonth?: string) => {
    const ym = dueForMonth ? nextUtcMonthYYYYMM(dueForMonth) : null;
    if (!ym) {
      showToast('Could not derive next month from due date', 'error');
      return;
    }
    setRowBusyKey(`${uid}:extend`);
    try {
      if (await putBillingAnchorForUser(uid, ym)) {
        await loadOverdueUsers();
      }
    } finally {
      setRowBusyKey(null);
    }
  };

  const handleRowUnblock = async (uid: string) => {
    setRowBusyKey(`${uid}:unblock`);
    try {
      if (await postClearAccessBlock(uid)) {
        await loadOverdueUsers();
      }
    } finally {
      setRowBusyKey(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Monthly Fee</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review and confirm monthly fee payments (type: <span className="font-mono">monthly_fee</span>).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setView('payments')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === 'payments'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            type="button"
          >
            Payments
          </button>
          <button
            onClick={() => setView('directory')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === 'directory'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            type="button"
          >
            Billing directory
          </button>
          <button
            onClick={() => setView('overdue')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === 'overdue'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            type="button"
          >
            Pending fees
          </button>
          {view === 'overdue' && (
            <button
              type="button"
              onClick={() => loadOverdueUsers()}
              disabled={overdueLoading}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {overdueLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {view === 'directory' ? (
          <MonthlyFeeBillingDirectoryPanel
            packageOptions={packageOptions}
            onOpenProfile={openUserProfile}
            openingProfileId={openingProfileId}
            onConfirmPayment={confirmPayment}
            confirmingPaymentId={confirmingPaymentId}
          />
        ) : view === 'overdue' ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <strong className="text-gray-800 dark:text-gray-200">Unpaid fee</strong> for the previous UTC month
              {overdueMeta.pastMonthLabel ? (
                <>
                  {' '}
                  (<span className="font-medium text-amber-700 dark:text-amber-300">{overdueMeta.pastMonthLabel}</span>)
                </>
              ) : null}
              . Use the billing assistant below to focus by status, package, last paid, or amount due.
            </p>

            {!overdueLoading && !overdueError && overdueUsers.length > 0 && (
              <div className="mb-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/40 dark:via-gray-900 dark:to-violet-950/30 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Billing assistant</p>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80">
                      {billingAssistant.needsAttention} need attention · ${billingAssistant.amountDue.toFixed(0)} due ·{' '}
                      {billingAssistant.neverPaid} never paid a monthly fee
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: 'overdue', label: `Overdue (${billingAssistant.overdue})`, status: 'overdue' as const },
                    { key: 'in_grace', label: `In grace (${billingAssistant.in_grace})`, status: 'in_grace' as const },
                    {
                      key: 'pending_confirmation',
                      label: `Pending review (${billingAssistant.pending_confirmation})`,
                      status: 'pending_confirmation' as const,
                    },
                    {
                      key: 'never',
                      label: `Never paid (${billingAssistant.neverPaid})`,
                      status: null,
                      lastPaid: 'never' as const,
                    },
                  ].map((chip) => {
                    const active =
                      chip.status != null
                        ? pendingStatusFilter === chip.status
                        : pendingLastPaidFilter === chip.lastPaid;
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => {
                          if (chip.status) {
                            setPendingStatusFilter((prev) => (prev === chip.status ? 'all' : chip.status!));
                            setPendingLastPaidFilter('all');
                          } else if (chip.lastPaid) {
                            setPendingLastPaidFilter((prev) => (prev === chip.lastPaid ? 'all' : chip.lastPaid!));
                            setPendingStatusFilter('all');
                            setHideNoFeeRows(true);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white/80 dark:bg-gray-800/80 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                  {billingAssistant.packageBreakdown.map((pkg) => {
                    const active = pendingPackageFilter === pkg.name;
                    return (
                      <button
                        key={pkg.name}
                        type="button"
                        onClick={() => setPendingPackageFilter((prev) => (prev === pkg.name ? '' : pkg.name))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white/80 dark:bg-gray-800/80 text-violet-900 dark:text-violet-100 border-violet-200 dark:border-violet-700 hover:bg-violet-100/70 dark:hover:bg-violet-900/40'
                        }`}
                      >
                        {pkg.name} ({pkg.count})
                      </button>
                    );
                  })}
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideNoFeeRows}
                    onChange={(e) => setHideNoFeeRows(e.target.checked)}
                    className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  Hide lifetime / no monthly fee rows
                </label>
              </div>
            )}

            <div className="flex flex-col lg:flex-row flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search name or email…"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <select
                value={pendingStatusFilter}
                onChange={(e) =>
                  setPendingStatusFilter(
                    e.target.value as
                      | 'all'
                      | 'in_grace'
                      | 'overdue'
                      | 'pending_confirmation'
                      | 'no_fee_required'
                  )
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[160px]"
              >
                <option value="all">All statuses</option>
                <option value="in_grace">In grace (UTC)</option>
                <option value="overdue">Overdue</option>
                <option value="pending_confirmation">Payment pending review</option>
                <option value="no_fee_required">Lifetime / no monthly fee</option>
              </select>
              <select
                value={pendingPackageFilter}
                onChange={(e) => setPendingPackageFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[160px]"
              >
                <option value="">All packages</option>
                {packageOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={pendingLastPaidFilter}
                onChange={(e) =>
                  setPendingLastPaidFilter(e.target.value as 'all' | 'never' | '90d' | 'older')
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[160px]"
              >
                <option value="all">Last paid: any</option>
                <option value="never">Never paid</option>
                <option value="90d">Paid in last 90 days</option>
                <option value="older">Last paid 90+ days ago</option>
              </select>
            </div>

            {view === 'overdue' && !overdueLoading && !overdueError && overdueUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/30 text-violet-950 dark:text-violet-100">
                <span className="text-sm font-semibold shrink-0">{selectedPendingIds.size} selected</span>
                <button
                  type="button"
                  disabled={selectedPendingIds.size === 0}
                  onClick={() => setSelectedPendingIds(new Set())}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-violet-400 dark:border-violet-500 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 disabled:opacity-40"
                >
                  Clear selection
                </button>
                <span className="hidden sm:inline h-6 w-px bg-violet-300 dark:bg-violet-600 shrink-0" aria-hidden />
                <label className="flex flex-wrap items-center gap-2 text-xs font-medium text-violet-900 dark:text-violet-200">
                  <span className="shrink-0">Billing starts (UTC)</span>
                  <input
                    type="month"
                    value={bulkAnchorMonth}
                    onChange={(e) => setBulkAnchorMonth(e.target.value)}
                    className="rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={bulkBusy !== null || selectedPendingIds.size === 0}
                  onClick={() => void runBulkSendInvoices()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {bulkBusy === 'invoice' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send invoices
                </button>
                <button
                  type="button"
                  disabled={bulkBusy !== null || selectedPendingIds.size === 0}
                  onClick={() => void runBulkPutAnchor(bulkAnchorMonth)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {bulkBusy === 'anchor' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarRange className="w-3.5 h-3.5" />}
                  Apply to selected
                </button>
                <button
                  type="button"
                  disabled={bulkBusy !== null || selectedPendingIds.size === 0}
                  onClick={() => void runBulkClearAnchors()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-500 text-violet-900 dark:text-violet-100 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 disabled:opacity-50"
                >
                  {bulkBusy === 'clear' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Clear anchors
                </button>
                <button
                  type="button"
                  disabled={bulkBusy !== null || selectedPendingIds.size === 0}
                  onClick={() => void runBulkUnblockAccess()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-500 text-violet-900 dark:text-violet-100 hover:bg-violet-100/80 dark:hover:bg-violet-900/40 disabled:opacity-50"
                  title="Removes admin “block until paid” only when that pending fee exists"
                >
                  {bulkBusy === 'unblock' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                  Unblock access
                </button>
              </div>
            )}

            {overdueMeta.note && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                {overdueMeta.note}
              </p>
            )}
            {!overdueMeta.note && overdueUsers.length === 0 && !overdueLoading && !overdueError && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                If the list is empty, either everyone has paid for the past UTC month, or there are no students on a fee-paying
                package. Narrow with status or package if needed.
              </p>
            )}
            {overdueLoading ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading overdue users...</div>
            ) : overdueError ? (
              <div className="py-12 text-center text-red-600 dark:text-red-400">{overdueError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="w-10 py-3 px-2 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-400 text-violet-600 focus:ring-violet-500"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate =
                                !allVisibleSelected &&
                                selectablePendingIds.some((id) => selectedPendingIds.has(id));
                            }
                          }}
                          onChange={toggleSelectAllVisiblePending}
                          disabled={selectablePendingIds.length === 0}
                          title="Select all rows in this list"
                          aria-label="Select all rows"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Package</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Next billing</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Last paid</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Due month</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount due</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Days past grace</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingRows.map((row: any, idx: number) => {
                      const status = row.feeStatus as string;
                      const statusLabel =
                        status === 'in_grace'
                          ? 'In grace'
                          : status === 'pending_confirmation'
                          ? 'Pending review'
                          : status === 'overdue'
                          ? 'Overdue'
                          : status === 'no_fee_required'
                          ? 'No monthly fee'
                          : status || '—';
                      const statusClass =
                        status === 'in_grace'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200'
                          : status === 'pending_confirmation'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                          : status === 'no_fee_required'
                          ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                          : status === 'overdue'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                      const uid = row.user?._id ? String(row.user._id) : '';
                      const rowBusy = rowBusyKey?.startsWith(`${uid}:`) ?? false;
                      const canQuickExtend =
                        !!uid &&
                        !!row.dueForMonth &&
                        status !== 'no_fee_required';
                      return (
                        <tr
                          key={(row.user?._id || idx) as any}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="py-4 px-2 w-10 align-middle">
                            <input
                              type="checkbox"
                              className="rounded border-gray-400 text-violet-600 focus:ring-violet-500"
                              checked={!!uid && selectedPendingIds.has(uid)}
                              disabled={!uid}
                              onChange={() => uid && togglePendingRowSelected(uid)}
                              aria-label={`Select ${row.user?.firstName || ''} ${row.user?.lastName || ''}`}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {row.user?.firstName || 'Unknown'} {row.user?.lastName || ''}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{row.user?.email || 'No email'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {row.joinedAt
                              ? new Date(row.joinedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })
                              : '—'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{row.packageName || '—'}</td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 max-w-[180px]">
                            {row.nextBillingLabel || '—'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {formatUtcDateLabel(row.lastPaidAt)}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {row.dueForMonth
                              ? new Date(row.dueForMonth).toLocaleDateString(undefined, { timeZone: 'UTC' })
                              : '—'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                            {status === 'no_fee_required' ? (
                              <div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400">$0.00</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-500 mt-0.5">No monthly fee</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold">
                                  $
                                  {Number(
                                    row.amountPending != null && row.amountPending !== ''
                                      ? row.amountPending
                                      : row.monthlyFeeAmount ?? 50
                                  ).toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">USD</span>
                                {status === 'pending_confirmation' && (
                                  <span className="block text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                    Awaiting confirmation
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-800 dark:text-gray-200">{row.daysOverdue ?? 0}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <AdminRowActionsMenu
                              disabled={rowBusy || openingProfileId === uid}
                              items={[
                                {
                                  id: 'confirm',
                                  label: 'Confirm payment',
                                  icon: CheckCircle,
                                  tone: 'success',
                                  hidden: !(row.pendingPaymentId && row.feeStatus === 'pending_confirmation'),
                                  loading: confirmingPaymentId === String(row.pendingPaymentId),
                                  disabled: confirmingPaymentId === String(row.pendingPaymentId),
                                  onClick: () => confirmPayment(String(row.pendingPaymentId)),
                                },
                                {
                                  id: 'invoice',
                                  label: 'Send invoice',
                                  icon: Mail,
                                  tone: 'info',
                                  hidden: !uid || status === 'no_fee_required',
                                  loading: rowBusyKey === `${uid}:invoice`,
                                  disabled: rowBusy,
                                  onClick: () => void sendInvoiceOne(uid),
                                },
                                {
                                  id: 'defer',
                                  label: 'Defer billing',
                                  icon: CalendarRange,
                                  tone: 'success',
                                  hidden: !canQuickExtend || !uid,
                                  loading: rowBusyKey === `${uid}:extend`,
                                  disabled: rowBusy,
                                  onClick: () => void handleRowExtendFromDue(uid, row.dueForMonth),
                                },
                                {
                                  id: 'unblock',
                                  label: 'Unblock access',
                                  icon: Unlock,
                                  tone: 'warning',
                                  hidden: !uid,
                                  loading: rowBusyKey === `${uid}:unblock`,
                                  disabled: rowBusy,
                                  onClick: () => void handleRowUnblock(uid),
                                },
                                {
                                  id: 'history',
                                  label: 'Fee history',
                                  icon: History,
                                  tone: 'info',
                                  hidden: !uid,
                                  onClick: () =>
                                    setHistoryTarget({
                                      id: uid,
                                      label: `${row.user?.firstName || ''} ${row.user?.lastName || ''} (${row.user?.email || ''})`.trim(),
                                    }),
                                },
                                {
                                  id: 'profile',
                                  label: 'View user',
                                  icon: UserCircle,
                                  hidden: !uid,
                                  loading: openingProfileId === uid,
                                  disabled: openingProfileId === uid,
                                  onClick: () => openUserProfile(uid),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPendingRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-gray-500 dark:text-gray-400">
                          {overdueUsers.length > 0 && (pendingSearch.trim() || pendingLastPaidFilter !== 'all' || hideNoFeeRows)
                            ? 'No rows match your filters.'
                            : overdueUsers.length === 0
                            ? `No unpaid fees for ${overdueMeta.pastMonthLabel || 'the previous UTC month'} — everyone has paid, or no eligible students.`
                            : 'No rows match these filters.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by user/email/payment ID/txn hash..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyFeePayments.map((p: any) => (
                    <tr
                      key={p._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {p.user?.firstName || 'Unknown'} {p.user?.lastName || ''}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{p.user?.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${(Number(p.finalAmount ?? p.amount ?? 0)).toFixed(2)} {p.currency || 'USD'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : p.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {String(p.status || '').charAt(0).toUpperCase() + String(p.status || '').slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <AdminRowActionsMenu
                          items={[
                            {
                              id: 'details',
                              label: 'View details',
                              icon: Eye,
                              onClick: () => setSelectedPayment(p),
                            },
                            {
                              id: 'confirm',
                              label: confirmingPaymentId === p._id ? 'Confirming…' : 'Confirm payment',
                              icon: CheckCircle,
                              tone: 'success',
                              hidden: !(p.status === 'pending' && p.paymentMethod === 'binance_wallet'),
                              loading: confirmingPaymentId === p._id,
                              disabled: confirmingPaymentId === p._id,
                              onClick: () => confirmPayment(p._id),
                            },
                            {
                              id: 'history',
                              label: 'Fee history',
                              icon: History,
                              tone: 'info',
                              hidden: !(p.user as { _id?: string })?._id,
                              onClick: () =>
                                setHistoryTarget({
                                  id: String((p.user as { _id: string })._id),
                                  label: `${p.user?.firstName || ''} ${p.user?.lastName || ''} (${p.user?.email || ''})`.trim(),
                                }),
                            },
                            {
                              id: 'profile',
                              label: 'View user',
                              icon: UserCircle,
                              hidden: !(p.user as { _id?: string })?._id,
                              loading:
                                openingProfileId === String((p.user as { _id?: string })?._id || ''),
                              disabled:
                                openingProfileId === String((p.user as { _id?: string })?._id || ''),
                              onClick: () =>
                                openUserProfile(String((p.user as { _id: string })._id)),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                  {monthlyFeePayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                        No monthly fee payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {historyTarget && (
        <MonthlyFeeHistoryModal
          userId={historyTarget.id}
          userLabel={historyTarget.label}
          onClose={() => setHistoryTarget(null)}
          onConfirmed={() => {
            onRefresh?.();
            loadOverdueUsers();
          }}
        />
      )}

      {profileUser && (
        <UserDetailsModal
          user={profileUser}
          onClose={() => setProfileUser(null)}
        />
      )}

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Fee Payment</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div><span className="font-semibold">Payment ID:</span> <span className="font-mono">{selectedPayment._id}</span></div>
              <div><span className="font-semibold">User:</span> {selectedPayment.user?.firstName} {selectedPayment.user?.lastName} ({selectedPayment.user?.email})</div>
              <div><span className="font-semibold">Amount:</span> ${(Number((selectedPayment as any).finalAmount ?? selectedPayment.amount ?? 0)).toFixed(2)} {selectedPayment.currency}</div>
              <div><span className="font-semibold">Status:</span> {selectedPayment.status}</div>
              <div><span className="font-semibold">Transaction ID:</span> {(selectedPayment as any).transactionId || '—'}</div>
              <div><span className="font-semibold">Txn Hash:</span> {(selectedPayment as any).binanceWallet?.transactionHash || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

