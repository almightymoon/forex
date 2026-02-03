'use client';

import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, AlertCircle, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '@/utils/toast';

interface EmailRecord {
  _id: string;
  userId?: { _id: string; email: string; firstName: string; lastName: string; role: string };
  type: string;
  channel: string;
  status: string;
  title: string;
  message: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface EmailHistoryProps {
  /** When set, filter by this user ID and optionally hide the user filter UI */
  userIdFilter?: string;
  hideUserIdFilter?: boolean;
}

export default function EmailHistory({ userIdFilter: userIdFilterProp, hideUserIdFilter }: EmailHistoryProps = {}) {
  const [items, setItems] = useState<EmailRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);
  const [viewingEmail, setViewingEmail] = useState<EmailRecord | null>(null);

  const effectiveUserIdFilter = userIdFilterProp ?? userIdFilter;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('skip', String(skip));
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (effectiveUserIdFilter) params.set('userId', effectiveUserIdFilter);
      const res = await fetch(buildApiUrl(`api/admin/email-history?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total ?? 0);
      } else {
        showToast('Failed to load email history', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load email history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [skip, typeFilter, statusFilter, effectiveUserIdFilter]);

  const statusIcon = (status: string) => {
    if (status === 'sent' || status === 'delivered') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          Email History
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View emails sent to students and users. Filter by type or status.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setSkip(0); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="payment">Payment</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="payment_confirmed">Payment Confirmed</option>
            <option value="account_verified">Account Verified</option>
            <option value="commission">Commission</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="withdrawal_request">Withdrawal Request</option>
            <option value="withdrawal_confirmed">Withdrawal Confirmed</option>
            <option value="system">System</option>
            <option value="admin">Admin</option>
            <option value="live_session">Live Session</option>
            <option value="bulk">Bulk</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSkip(0); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          {!hideUserIdFilter && (
            <input
              type="text"
              placeholder="User ID (filter)"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              onBlur={() => setSkip(0)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm w-48"
            />
          )}
          <button
            onClick={() => { setSkip(0); fetchHistory(); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No email records found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Error</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((row) => (
                <tr key={row._id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(row.sentAt || row.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.userId ? (
                      <span className="text-gray-900 dark:text-white">{row.userId.email}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {row.userId && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.userId.firstName} {row.userId.lastName} · {row.userId.role}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={row.title}>{row.title}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1">
                      {statusIcon(row.status)}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 max-w-xs truncate" title={row.errorMessage || ''}>{row.errorMessage || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setViewingEmail(row)}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* View email content modal */}
      {viewingEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingEmail(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email content
              </h3>
              <button
                type="button"
                onClick={() => setViewingEmail(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Subject:</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">{viewingEmail.title}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">To:</span>
                  <p className="text-gray-900 dark:text-white mt-0.5">
                    {viewingEmail.userId ? `${viewingEmail.userId.firstName} ${viewingEmail.userId.lastName} <${viewingEmail.userId.email}>` : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Date:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{formatDate(viewingEmail.sentAt || viewingEmail.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{viewingEmail.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Status:</span>
                    <span className="ml-2 inline-flex items-center gap-1">
                      {statusIcon(viewingEmail.status)}
                      {viewingEmail.status}
                    </span>
                  </div>
                </div>
                {viewingEmail.errorMessage && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Error:</span>
                    <p className="text-red-600 dark:text-red-400 mt-0.5">{viewingEmail.errorMessage}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <span className="text-gray-500 dark:text-gray-400 font-medium text-sm block mb-2">Body:</span>
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-4 max-h-96 overflow-y-auto">
                  {viewingEmail.message ? (
                    isHtml(viewingEmail.message) ? (
                      <div
                        className="email-content-body prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100"
                        dangerouslySetInnerHTML={{ __html: viewingEmail.message }}
                      />
                    ) : (
                      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">{viewingEmail.message}</pre>
                    )
                  ) : (
                    <span className="text-gray-400">No content</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {total > limit && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= total}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
