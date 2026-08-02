'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  History,
  Loader2,
  Mail,
  Receipt,
  Search,
  UserCircle
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import type { User } from './types';
import BulkImposeMonthlyFeeModal from './BulkImposeMonthlyFeeModal';
import MonthlyFeeHistoryModal from './MonthlyFeeHistoryModal';
import AdminRowActionsMenu from './AdminRowActionsMenu';

export type BillingDirectoryRow = {
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  joinedAt?: string | null;
  packagePurchasedAt?: string | null;
  packageName?: string;
  monthlyFeeAmount?: number;
  amountPending?: number;
  feeStatus?: string;
  nextBillingLabel?: string;
  lastPaidAt?: string | null;
  dueForMonth?: string;
  daysOverdue?: number;
  pendingPaymentId?: string | null;
};

type Props = {
  packageOptions: { name: string }[];
  onOpenProfile: (userId: string) => void;
  openingProfileId: string | null;
  onConfirmPayment?: (paymentId: string) => void;
  confirmingPaymentId?: string | null;
};

function formatUtcDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { timeZone: 'UTC' });
  } catch {
    return '—';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'in_grace':
      return 'In grace';
    case 'overdue':
      return 'Overdue';
    case 'pending_confirmation':
      return 'Pending review';
    case 'no_fee_required':
      return 'No monthly fee';
    case 'paid_current':
      return 'Paid this cycle';
    case 'in_free_period':
      return 'Free period';
    case 'billing_deferred':
      return 'Billing deferred';
    default:
      return status || '—';
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'in_grace':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200';
    case 'pending_confirmation':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200';
    case 'no_fee_required':
    case 'paid_current':
      return 'bg-slate-200 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200';
    case 'in_free_period':
    case 'billing_deferred':
      return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200';
    case 'overdue':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }
}

function rowToUser(row: BillingDirectoryRow): User {
  const u = row.user;
  return {
    _id: String(u._id),
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || '',
    role: 'student',
    subscription: { plan: row.packageName || '', isActive: true },
    createdAt: row.joinedAt || new Date().toISOString()
  };
}

export default function MonthlyFeeBillingDirectoryPanel({
  packageOptions,
  onOpenProfile,
  openingProfileId,
  onConfirmPayment,
  confirmingPaymentId
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<BillingDirectoryRow[]>([]);
  const [meta, setMeta] = useState<{ pastMonthLabel?: string }>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('');
  const [joinedAfter, setJoinedAfter] = useState('');
  const [joinedBefore, setJoinedBefore] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [showBulkImpose, setShowBulkImpose] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; label: string } | null>(null);

  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (packageFilter.trim()) params.set('packageName', packageFilter.trim());
      if (search.trim()) params.set('search', search.trim());
      if (joinedAfter) params.set('joinedAfter', joinedAfter);
      if (joinedBefore) params.set('joinedBefore', joinedBefore);

      const res = await fetch(buildApiUrl(`api/admin/monthly-fee/billing-directory?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load billing directory');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data?.users) ? data.users : []);
      setMeta({ pastMonthLabel: data?.pastMonthLabel });
    } catch {
      setError('Failed to load billing directory');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, packageFilter, search, joinedAfter, joinedBefore]);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const selectableIds = useMemo(
    () => rows.map((r) => (r.user?._id ? String(r.user._id) : '')).filter(Boolean),
    [rows]
  );

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const selectedRows = useMemo(
    () => rows.filter((r) => r.user?._id && selectedIds.has(String(r.user._id))),
    [rows, selectedIds]
  );

  const selectedUsersForImpose = useMemo(() => selectedRows.map(rowToUser), [selectedRows]);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...selectableIds]);
    });
  };

  const sendInvoicesBulk = async () => {
    const ids = [...selectedIds];
    if (!ids.length) {
      showToast('Select at least one student', 'error');
      return;
    }
    setInvoiceBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/monthly-fee/send-invoice-bulk'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds: ids })
      });
      const data = await res.json().catch(() => ({}));
      const ok = data.summary?.succeeded ?? 0;
      const fail = data.summary?.failed ?? 0;
      showToast(
        fail ? `Sent ${ok} invoice(s), ${fail} skipped or failed.` : `Sent ${ok} invoice(s).`,
        ok ? 'success' : 'error'
      );
      setSelectedIds(new Set());
      await loadDirectory();
    } catch {
      showToast('Failed to send invoices', 'error');
    } finally {
      setInvoiceBusy(false);
    }
  };

  const sendInvoiceOne = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/monthly-fee/send-invoice'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || data?.errors?.[0]?.msg || 'Could not send invoice', 'error');
        return;
      }
      showToast(data?.message || 'Invoice sent', 'success');
    } catch {
      showToast('Failed to send invoice', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        All students with a completed package purchase. Filter by package, billing status, or join date.
        {meta.pastMonthLabel ? (
          <>
            {' '}
            Current cycle fee month:{' '}
            <span className="font-medium text-amber-700 dark:text-amber-300">{meta.pastMonthLabel}</span>.
          </>
        ) : null}
      </p>

      <div className="flex flex-col xl:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadDirectory()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[160px]"
        >
          <option value="all">All statuses</option>
          <option value="overdue">Overdue</option>
          <option value="in_grace">In grace</option>
          <option value="pending_confirmation">Pending review</option>
          <option value="paid_current">Paid this cycle</option>
          <option value="in_free_period">Free period</option>
          <option value="billing_deferred">Billing deferred</option>
          <option value="no_fee_required">Lifetime / no fee</option>
        </select>
        <select
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[140px]"
        >
          <option value="">All packages</option>
          {packageOptions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          Joined after
          <input
            type="date"
            value={joinedAfter}
            onChange={(e) => setJoinedAfter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          Joined before
          <input
            type="date"
            value={joinedBefore}
            onChange={(e) => setJoinedBefore(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadDirectory()}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Apply filters'}
        </button>
      </div>

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/30">
          <span className="text-sm font-semibold text-indigo-950 dark:text-indigo-100 shrink-0">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            disabled={!selectedIds.size}
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-medium px-2 py-1 rounded-lg border border-indigo-400 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={invoiceBusy || !selectedIds.size}
            onClick={() => void sendInvoicesBulk()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {invoiceBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Send invoice
          </button>
          <button
            type="button"
            disabled={!selectedIds.size}
            onClick={() => setShowBulkImpose(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-500 text-indigo-900 dark:text-indigo-100 hover:bg-indigo-100/80 disabled:opacity-50"
          >
            <Receipt className="w-3.5 h-3.5" />
            Impose fee
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading billing directory…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="w-10 py-3 px-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-400 text-indigo-600"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={!selectableIds.length}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">User</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Joined</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Package bought</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Package</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Next billing</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Last paid</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Status</th>
                <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Due</th>
                <th className="text-right py-3 px-3 font-semibold text-gray-900 dark:text-white text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const uid = row.user?._id ? String(row.user._id) : '';
                const st = row.feeStatus || '';
                const canInvoice =
                  st === 'overdue' || st === 'in_grace' || st === 'pending_confirmation';
                return (
                  <tr
                    key={uid || idx}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-400 text-indigo-600"
                        checked={!!uid && selectedIds.has(uid)}
                        disabled={!uid}
                        onChange={() => uid && toggleRow(uid)}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {row.user?.firstName} {row.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{row.user?.email}</p>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatUtcDate(row.joinedAt)}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatUtcDate(row.packagePurchasedAt)}
                    </td>
                    <td className="py-3 px-3 text-sm">{row.packageName || '—'}</td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px]">
                      {row.nextBillingLabel || '—'}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {formatUtcDate(row.lastPaidAt)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(st)}`}>
                        {statusLabel(st)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {st === 'no_fee_required' || st === 'paid_current' || st === 'in_free_period' ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span className="font-semibold">
                          ${Number(row.amountPending ?? row.monthlyFeeAmount ?? 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <AdminRowActionsMenu
                        items={[
                          {
                            id: 'confirm',
                            label: 'Confirm payment',
                            icon: CheckCircle,
                            tone: 'success',
                            hidden: !(
                              row.pendingPaymentId &&
                              st === 'pending_confirmation' &&
                              Boolean(onConfirmPayment)
                            ),
                            loading: confirmingPaymentId === String(row.pendingPaymentId),
                            disabled: confirmingPaymentId === String(row.pendingPaymentId),
                            onClick: () => onConfirmPayment?.(String(row.pendingPaymentId)),
                          },
                          {
                            id: 'invoice',
                            label: 'Send invoice',
                            icon: Mail,
                            tone: 'info',
                            hidden: !(canInvoice && uid),
                            onClick: () => void sendInvoiceOne(uid),
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
                                label: `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim(),
                              }),
                          },
                          {
                            id: 'profile',
                            label: 'View user',
                            icon: UserCircle,
                            hidden: !uid,
                            loading: openingProfileId === uid,
                            disabled: openingProfileId === uid,
                            onClick: () => onOpenProfile(uid),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    No students match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showBulkImpose && selectedUsersForImpose.length > 0 && (
        <BulkImposeMonthlyFeeModal
          users={selectedUsersForImpose}
          onClose={() => setShowBulkImpose(false)}
          onComplete={({ succeeded, failed }) => {
            showToast(
              failed
                ? `Imposed fee for ${succeeded} student(s), ${failed} failed.`
                : `Imposed fee for ${succeeded} student(s).`,
              succeeded ? 'success' : 'error'
            );
            setShowBulkImpose(false);
            setSelectedIds(new Set());
            void loadDirectory();
          }}
        />
      )}

      {historyTarget && (
        <MonthlyFeeHistoryModal
          userId={historyTarget.id}
          userLabel={historyTarget.label}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
