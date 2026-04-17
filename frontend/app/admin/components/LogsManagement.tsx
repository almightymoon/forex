'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, Search, Server, Filter, Eye, X } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { useToast } from '../../../components/Toast';

type LogSource = 'activity' | 'app' | 'access';

type ActivityLogItem = {
  _id: string;
  createdAt?: string;
  action: string;
  actor?: { userId?: string; email?: string; role?: string };
  entity?: { type?: string; id?: string; label?: string };
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
};

export default function LogsManagement() {
  const { showToast } = useToast();
  const [source, setSource] = useState<LogSource>('activity');
  const [limit, setLimit] = useState<number>(50);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Activity table state
  const [activityItems, setActivityItems] = useState<ActivityLogItem[]>([]);
  const [activityTotal, setActivityTotal] = useState<number>(0);
  const [skip, setSkip] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actorEmailFilter, setActorEmailFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ActivityLogItem | null>(null);

  const canFetch = useMemo(() => typeof window !== 'undefined', []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams();
      // Activity logs endpoint uses q/limit/skip and returns items/total
      if (source === 'activity') {
        qs.set('limit', String(Math.min(limit, 200)));
        qs.set('skip', String(Math.max(skip, 0)));
        if (search.trim()) qs.set('q', search.trim());
        if (actionFilter) qs.set('action', actionFilter);
        if (entityTypeFilter) qs.set('entityType', entityTypeFilter);
        if (actorEmailFilter) qs.set('actorEmail', actorEmailFilter);
      } else {
        qs.set('source', source);
        qs.set('limit', String(limit));
        if (search.trim()) qs.set('search', search.trim());
      }

      const primaryEndpoint =
        source === 'activity' ? `api/admin/activity-logs?${qs.toString()}` : `api/admin/logs?${qs.toString()}`;
      const primaryUrl = buildApiUrl(primaryEndpoint);

      let res = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      // Backwards/URL-shape fallback (some deployments may not include /api in base)
      if (res.status === 404) {
        const fallbackUrl =
          source === 'activity' ? buildApiUrl(`admin/activity-logs?${qs.toString()}`) : buildApiUrl(`admin/logs?${qs.toString()}`);
        res = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token || ''}`
          }
        });
      }

      if (!res.ok) {
        let detail = '';
        try {
          const err = await res.clone().json();
          detail = err?.message || err?.error || '';
        } catch {}

        if (res.status === 401) {
          showToast(detail || 'Unauthorized. Please login again as an admin.', 'error');
        } else if (res.status === 403) {
          showToast(detail || 'Forbidden. Admin access is required to view logs.', 'error');
        } else {
          showToast(`Failed to load logs (HTTP ${res.status})${detail ? `: ${detail}` : ''}`, 'error');
        }
        return;
      }

      const data = await res.json();
      if (source === 'activity') {
        const items = Array.isArray(data.items) ? (data.items as ActivityLogItem[]) : [];
        setActivityItems(items);
        setActivityTotal(typeof data.total === 'number' ? data.total : 0);
      } else {
        setLines(Array.isArray(data.lines) ? data.lines : []);
      }
      setLastUpdated(Date.now());
    } catch (e: any) {
      showToast(e?.message || 'Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canFetch) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, skip]);

  useEffect(() => {
    if (!canFetch) return;
    if (source !== 'activity') return;
    const t = setTimeout(() => {
      setSkip(0);
      fetchLogs();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, limit, search, actionFilter, entityTypeFilter, actorEmailFilter]);

  const quickActions = [
    { id: '', label: 'All' },
    { id: 'user.registered', label: 'User joined' },
    { id: 'payment.created', label: 'Payment created' },
    { id: 'payment.confirmed', label: 'Package bought' },
    { id: 'user.login', label: 'Login' },
    { id: 'admin.post', label: 'Admin POST' },
    { id: 'admin.put', label: 'Admin PUT' },
    { id: 'admin.delete', label: 'Admin DELETE' }
  ];

  const getEventLabel = (action: string) => {
    switch (action) {
      case 'user.registered':
        return 'User joined';
      case 'user.login':
        return 'User login';
      case 'payment.created':
        return 'Payment created';
      case 'payment.confirmed':
        return 'Package bought';
      case 'admin.post':
        return 'Admin action (POST)';
      case 'admin.put':
        return 'Admin action (PUT)';
      case 'admin.patch':
        return 'Admin action (PATCH)';
      case 'admin.delete':
        return 'Admin action (DELETE)';
      default:
        return action;
    }
  };

  const getBadgeClasses = (action: string) => {
    if (action === 'payment.confirmed') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800';
    }
    if (action === 'payment.created') {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
    }
    if (action === 'user.registered') {
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
    }
    if (action === 'user.login') {
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800';
    }
    if (action.startsWith('admin.')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800';
  };

  const getPackageName = (it: ActivityLogItem) => {
    return (
      (it.metadata && (it.metadata.packageName || it.metadata.package)) ||
      (it.entity && it.entity.type === 'package' ? it.entity.label : '') ||
      ''
    );
  };

  const getAmount = (it: ActivityLogItem) => {
    const m = it.metadata || {};
    const amount = m.finalAmount ?? m.amount ?? m.packageAmount;
    if (amount === undefined || amount === null || amount === '') return '';
    const n = Number(amount);
    if (!Number.isFinite(n)) return String(amount);
    return `$${n}`;
  };

  const getUserEmail = (it: ActivityLogItem) => {
    const m = it.metadata || {};
    return (
      m.userEmail ||
      m.buyerEmail ||
      it.actor?.email ||
      ''
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Logs</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {source === 'activity' ? 'View activity logs (newest first)' : 'View server logs (newest first)'}
                {lastUpdated ? ` • Updated ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setSource('activity')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  source === 'activity'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="User/admin activity logs"
              >
                <span className="inline-flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Activity
                </span>
              </button>
              <button
                onClick={() => setSource('app')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  source === 'app'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Application server logs"
              >
                App
              </button>
              <button
                onClick={() => setSource('access')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  source === 'access'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="HTTP access logs"
              >
                Access
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={source === 'activity' ? 'Search action, actor, entity…' : 'Search logs…'}
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              />
            </div>

            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              title={source === 'activity' ? 'Rows to load' : 'Lines to load'}
            >
              {source === 'activity' ? (
                <>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                  <option value={200}>200 rows</option>
                </>
              ) : (
                <>
                  <option value={200}>200 lines</option>
                  <option value={500}>500 lines</option>
                  <option value={1000}>1000 lines</option>
                  <option value={2500}>2500 lines</option>
                  <option value={5000}>5000 lines</option>
                </>
              )}
            </select>

            <button
              onClick={() => {
                if (source === 'activity') setSkip(0);
                fetchLogs();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        {source === 'activity' ? (
          <>
            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Filters</span>
                  <span className="text-gray-500 dark:text-gray-400">{activityTotal ? `• ${activityTotal} total` : ''}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickActions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActionFilter(a.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        actionFilter === a.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Action</label>
                    <input
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      placeholder="e.g. payment.confirmed"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Actor email</label>
                    <input
                      value={actorEmailFilter}
                      onChange={(e) => setActorEmailFilter(e.target.value)}
                      placeholder="e.g. admin@site.com"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Entity type</label>
                    <input
                      value={entityTypeFilter}
                      onChange={(e) => setEntityTypeFilter(e.target.value)}
                      placeholder="e.g. user, payment"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Showing <span className="font-semibold">{activityItems.length}</span> rows
                    {activityTotal ? (
                      <>
                        {' '}
                        • Page <span className="font-semibold">{Math.floor(skip / Math.max(limit, 1)) + 1}</span> of{' '}
                        <span className="font-semibold">{Math.max(1, Math.ceil(activityTotal / Math.max(limit, 1)))}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSkip((s) => Math.max(0, s - limit))}
                      disabled={loading || skip === 0}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setSkip((s) => s + limit)}
                      disabled={loading || (activityTotal !== 0 && skip + limit >= activityTotal)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Event</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Actor</th>
                      <th className="px-4 py-3 font-semibold">Package</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Entity</th>
                      <th className="px-4 py-3 font-semibold">IP</th>
                      <th className="px-4 py-3 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {activityItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                          {loading ? 'Loading…' : 'No activity found.'}
                        </td>
                      </tr>
                    ) : (
                      activityItems.map((it) => {
                        const time = it.createdAt ? new Date(it.createdAt).toLocaleString() : '—';
                        const actor = it.actor?.email || '—';
                        const actorRole = it.actor?.role ? ` (${it.actor.role})` : '';
                        const entity = it.entity?.label || it.entity?.type || '—';
                        const ip = it.ip || '—';
                        const pkg = getPackageName(it);
                        const amount = getAmount(it);
                        const userEmail = getUserEmail(it);
                        const eventLabel = getEventLabel(it.action);

                        return (
                          <tr key={it._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{time}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getBadgeClasses(it.action)}`}>
                                {eventLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <div className="truncate max-w-[260px]" title={userEmail || ''}>
                                {userEmail || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <div className="truncate max-w-[260px]" title={`${actor}${actorRole}`}>
                                {actor}
                                <span className="text-gray-400 dark:text-gray-500">{actorRole}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <div className="truncate max-w-[220px]" title={pkg || ''}>
                                {pkg || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-200">{amount || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                              <div className="truncate max-w-[280px]" title={entity}>
                                {entity}
                              </div>
                              {it.entity?.type ? <div className="text-xs text-gray-400 dark:text-gray-500">{it.entity.type}</div> : null}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{ip}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedItem(it)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Details drawer */}
            {selectedItem && (
              <div className="fixed inset-0 z-[60]">
                <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedItem(null)} />
                <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Activity details</div>
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{getEventLabel(selectedItem.action)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{selectedItem.action}</div>
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 overflow-auto h-[calc(100%-68px)]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Time</div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400">IP</div>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedItem.ip || '—'}</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actor</div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {selectedItem.actor?.email || '—'}{' '}
                        <span className="text-gray-500 dark:text-gray-400">
                          {selectedItem.actor?.role ? `(${selectedItem.actor.role})` : ''}
                        </span>
                      </div>
                      {selectedItem.userAgent ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 break-words">
                          UA: {selectedItem.userAgent}
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entity</div>
                      <div className="text-sm text-gray-900 dark:text-white break-words">{selectedItem.entity?.label || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {selectedItem.entity?.type ? `type: ${selectedItem.entity.type}` : ''}
                        {selectedItem.entity?.id ? ` • id: ${selectedItem.entity.id}` : ''}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Metadata</div>
                      <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words font-mono">
                        {JSON.stringify(selectedItem.metadata || {}, null, 2)}
                      </pre>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(selectedItem, null, 2));
                            showToast('Activity copied to clipboard', 'success');
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Copy JSON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing <span className="font-semibold">{lines.length}</span> lines
                {search.trim() ? (
                  <>
                    {' '}
                    matching <span className="font-semibold">“{search.trim()}”</span>
                  </>
                ) : null}
              </div>
              <button
                onClick={() => {
                  const text = lines.slice().reverse().join('\n');
                  navigator.clipboard.writeText(text);
                  showToast('Logs copied to clipboard', 'success');
                }}
                disabled={lines.length === 0}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Copy
              </button>
            </div>

            <div className="p-4">
              <div className="h-[560px] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <pre className="text-xs leading-relaxed text-gray-900 dark:text-gray-100 p-4 whitespace-pre-wrap break-words font-mono">
                  {lines.length > 0 ? lines.join('\n') : loading ? 'Loading...' : 'No logs found.'}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

