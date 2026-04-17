'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, Search, Server } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { useToast } from '../../../components/Toast';

type LogSource = 'app' | 'access';

export default function LogsManagement() {
  const { showToast } = useToast();
  const [source, setSource] = useState<LogSource>('app');
  const [limit, setLimit] = useState<number>(500);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const canFetch = useMemo(() => typeof window !== 'undefined', []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams();
      qs.set('source', source);
      qs.set('limit', String(limit));
      if (search.trim()) qs.set('search', search.trim());
      const primaryEndpoint = `api/admin/logs?${qs.toString()}`;
      const primaryUrl = buildApiUrl(primaryEndpoint);

      let res = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      // Backwards/URL-shape fallback (some deployments may not include /api in base)
      if (res.status === 404) {
        const fallbackUrl = buildApiUrl(`admin/logs?${qs.toString()}`);
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
      setLines(Array.isArray(data.lines) ? data.lines : []);
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
  }, [source]);

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
                View server logs (newest first){lastUpdated ? ` • Updated ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setSource('app')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  source === 'app'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Application logs"
              >
                <span className="inline-flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  App
                </span>
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
                placeholder="Search logs…"
                className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              />
            </div>

            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
              title="Lines to load"
            >
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
              <option value={2500}>2500 lines</option>
              <option value={5000}>5000 lines</option>
            </select>

            <button
              onClick={fetchLogs}
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
              {lines.length > 0
                ? lines.join('\n')
                : loading
                  ? 'Loading...'
                  : 'No logs found.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

