'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Receipt, X } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import type { User } from './types';

const UTC_MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
] as const;

function defaultFeeForMonth(): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseFeeMonth(ym: string): { year: string; month: string } {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(ym.trim());
  if (!m) return { year: '', month: '' };
  return { year: m[1], month: m[2] };
}

function buildUtcYearOptions(): number[] {
  const current = new Date().getUTCFullYear();
  const years: number[] = [];
  for (let y = 2000; y <= current + 2; y += 1) years.push(y);
  return years;
}

type BulkResult = {
  userId: string;
  success: boolean;
  error?: string;
  userName?: string;
  paymentId?: string;
  amount?: number;
};

type Props = {
  users: User[];
  onClose: () => void;
  onComplete: (summary: { succeeded: number; failed: number }) => void;
};

export default function BulkImposeMonthlyFeeModal({ users, onClose, onComplete }: Props) {
  const studentUsers = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const skippedNonStudents = users.length - studentUsers.length;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [amount, setAmount] = useState('');
  const initialMonth = defaultFeeForMonth();
  const [feeYear, setFeeYear] = useState(() => parseFeeMonth(initialMonth).year);
  const [feeMonth, setFeeMonth] = useState(() => parseFeeMonth(initialMonth).month);
  const [blockAccess, setBlockAccess] = useState(true);
  const [forceWithoutMonthlyFee, setForceWithoutMonthlyFee] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);

  const yearOptions = useMemo(() => buildUtcYearOptions(), []);

  useEffect(() => {
    setSelectedIds(new Set(studentUsers.map((u) => u._id)));
  }, [studentUsers]);

  const selectedStudents = useMemo(
    () => studentUsers.filter((u) => selectedIds.has(u._id)),
    [studentUsers, selectedIds]
  );

  const feeForMonth =
    feeYear && feeMonth ? `${feeYear}-${feeMonth}` : '';

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => {
    setSelectedIds(new Set(studentUsers.map((u) => u._id)));
  };

  const clearStudentSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) return;
    if (!feeForMonth) return;

    const parsedAmount = amount.trim() ? parseFloat(amount) : undefined;
    if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount < 0.01)) {
      return;
    }

    setBusy(true);
    setResults(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/users/impose-monthly-fee-bulk'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedStudents.map((u) => u._id),
          ...(parsedAmount != null ? { amount: parsedAmount } : {}),
          notes: notes.trim() || undefined,
          blockAccessUntilPaid: blockAccess,
          forceWithoutMonthlyFeePackage: forceWithoutMonthlyFee || undefined,
          feeForMonth
        })
      });
      const data = await res.json().catch(() => ({}));
      const rows = (data.results || []) as BulkResult[];
      setResults(rows);
      const succeeded = data.summary?.succeeded ?? rows.filter((r) => r.success).length;
      const failed = data.summary?.failed ?? rows.filter((r) => !r.success).length;
      onComplete({ succeeded, failed });
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of studentUsers) {
      m.set(u._id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email);
    }
    return m;
  }, [studentUsers]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-impose-fee-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="bulk-impose-fee-title"
            className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <Receipt className="w-5 h-5 text-amber-600" />
            Impose monthly fee ({selectedStudents.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {skippedNonStudents > 0 && (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
            {skippedNonStudents} non-student account{skippedNonStudents > 1 ? 's' : ''} skipped (fees
            only apply to students).
          </p>
        )}

        {!results ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Creates a <strong>pending</strong> monthly fee for each checked student. Leave amount
              empty to use each user&apos;s package default.
            </p>

            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Students ({selectedStudents.length} of {studentUsers.length})
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    disabled={busy || studentUsers.length === 0}
                    className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={clearStudentSelection}
                    disabled={busy || selectedStudents.length === 0}
                    className="text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <ul className="text-sm max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {studentUsers.map((u) => (
                  <li key={u._id}>
                    <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u._id)}
                        onChange={() => toggleStudent(u._id)}
                        disabled={busy}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 shrink-0"
                      />
                      <span className="min-w-0 truncate text-gray-900 dark:text-white">
                        {u.firstName} {u.lastName}{' '}
                        <span className="text-gray-500 dark:text-gray-400">({u.email})</span>
                      </span>
                    </label>
                  </li>
                ))}
                {studentUsers.length === 0 && (
                  <li className="px-3 py-4 text-center text-gray-500">No students in selection.</li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Package default per user"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fee for month (UTC)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={feeMonth}
                    onChange={(e) => setFeeMonth(e.target.value)}
                    disabled={busy}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    aria-label="Month"
                  >
                    <option value="">Month</option>
                    {UTC_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={feeYear}
                    onChange={(e) => setFeeYear(e.target.value)}
                    disabled={busy}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    aria-label="Year"
                  >
                    <option value="">Year</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Calendar month this charge applies to (shown in student history and admin lists).
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockAccess}
                  onChange={(e) => setBlockAccess(e.target.checked)}
                  disabled={busy}
                  className="mt-1 rounded"
                />
                <span>
                  <strong>Block platform access</strong> until each fee is paid
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceWithoutMonthlyFee}
                  onChange={(e) => setForceWithoutMonthlyFee(e.target.checked)}
                  disabled={busy}
                  className="mt-1 rounded"
                />
                <span>
                  <strong>Impose anyway</strong> for tiers with monthly fee disabled or unmatched
                  package
                </span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={busy}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy || selectedStudents.length === 0 || !feeForMonth}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  Impose on {selectedStudents.length}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {results.filter((r) => r.success).length} succeeded,{' '}
              {results.filter((r) => !r.success).length} failed
            </p>
            <ul className="text-sm max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 mb-4">
              {results.map((r) => (
                <li
                  key={r.userId}
                  className={`px-3 py-2 ${r.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}
                >
                  <span className="font-medium">
                    {r.userName || nameById.get(r.userId) || r.userId}
                  </span>
                  {r.success ? (
                    <span className="text-gray-600 dark:text-gray-400">
                      {' '}
                      — ${Number(r.amount ?? 0).toFixed(2)} pending
                    </span>
                  ) : (
                    <span className="block text-xs mt-0.5 opacity-90">{r.error}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium"
            >
              Done
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
