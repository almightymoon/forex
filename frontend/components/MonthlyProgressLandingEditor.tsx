'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, LineChart, Loader2, Save, Upload } from 'lucide-react';
import { apiRequest, buildApiUrl, clearCache } from '../utils/api';
import { resolveBackendAssetUrl } from '../lib/resolveBackendAssetUrl';

type DisplayMode = 'structured' | 'split_images' | 'full_image';

type Row = { name: string; values: number[] };

type Doc = {
  enabled: boolean;
  title: string;
  subtitle: string;
  periodLabel: string;
  displayMode: DisplayMode;
  columnLabels: string[];
  rows: Row[];
  leftImageUrl: string;
  rightImageUrl: string;
  fullImageUrl: string;
};

const emptyDoc: Doc = {
  enabled: false,
  title: 'Monthly trading progress',
  subtitle: '',
  periodLabel: '',
  displayMode: 'structured',
  columnLabels: ['Jan', 'Feb', 'Mar'],
  rows: [],
  leftImageUrl: '',
  rightImageUrl: '',
  fullImageUrl: '',
};

function normalizeRowsForColumns(rows: Row[], colCount: number): Row[] {
  return rows.map((r) => ({
    name: r.name,
    values: Array.from({ length: colCount }, (_, i) => {
      const v = r.values[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }),
  }));
}

type Props = {
  /** e.g. `api/admin/monthly-progress` or `api/teacher/monthly-progress` */
  apiRoot: string;
};

export default function MonthlyProgressLandingEditor({ apiRoot }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<Doc>(emptyDoc);
  const [error, setError] = useState<string | null>(null);
  const [columnsInput, setColumnsInput] = useState('Jan, Feb, Mar');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest(apiRoot, { method: 'GET' }, false);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const d = json.data as Partial<Doc>;
      const merged: Doc = {
        ...emptyDoc,
        ...d,
        columnLabels: Array.isArray(d.columnLabels) ? d.columnLabels : emptyDoc.columnLabels,
        rows: Array.isArray(d.rows) ? d.rows : [],
      };
      setDoc(merged);
      setColumnsInput((merged.columnLabels || []).join(', '));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiRoot]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadAsset = async (which: 'left' | 'right' | 'full', file: File) => {
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(buildApiUrl(`${apiRoot}/upload`), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
    const url = json.url as string;
    if (which === 'left') setDoc((d) => ({ ...d, leftImageUrl: url }));
    if (which === 'right') setDoc((d) => ({ ...d, rightImageUrl: url }));
    if (which === 'full') setDoc((d) => ({ ...d, fullImageUrl: url }));
  };

  const syncColumnsFromInput = () => {
    const labels = columnsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);
    const colCount = Math.max(1, labels.length);
    setDoc((d) => ({
      ...d,
      columnLabels: labels,
      rows: normalizeRowsForColumns(d.rows, colCount),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const columnLabels = columnsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      const colCount = Math.max(1, columnLabels.length);
      const rows = normalizeRowsForColumns(doc.rows, colCount);
      const payload = { ...doc, columnLabels, rows };

      const res = await apiRequest(
        apiRoot,
        { method: 'PUT', body: JSON.stringify(payload) },
        false,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      clearCache(apiRoot);
      if (json.data) {
        const d = json.data as Partial<Doc>;
        setDoc({
          ...emptyDoc,
          ...d,
          columnLabels: Array.isArray(d.columnLabels) ? d.columnLabels : payload.columnLabels,
          rows: Array.isArray(d.rows) ? d.rows : payload.rows,
        });
        setColumnsInput(((d.columnLabels as string[]) || payload.columnLabels).join(', '));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    syncColumnsFromInput();
    const colCount = columnsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean).length;
    const n = Math.max(1, colCount);
    setDoc((d) => ({
      ...d,
      rows: [...d.rows, { name: `Series ${d.rows.length + 1}`, values: Array(n).fill(0) }],
    }));
  };

  const removeRow = (idx: number) => {
    setDoc((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== idx) }));
  };

  const updateRowName = (idx: number, name: string) => {
    setDoc((d) => ({
      ...d,
      rows: d.rows.map((r, i) => (i === idx ? { ...r, name } : r)),
    }));
  };

  const updateRowValue = (rowIdx: number, colIdx: number, raw: string) => {
    const n = parseFloat(raw.replace(/,/g, ''));
    setDoc((d) => ({
      ...d,
      rows: d.rows.map((r, i) => {
        if (i !== rowIdx) return r;
        const next = [...r.values];
        next[colIdx] = Number.isFinite(n) ? n : 0;
        return { ...r, values: next };
      }),
    }));
  };

  const colLabels = columnsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading monthly progress settings…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <LineChart className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Landing: monthly progress</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Controls the public home page section with either a data table plus chart, split screenshots, or one full
            infographic. Matches what visitors see at <code className="text-xs">/#monthly-progress</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold shadow-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={doc.enabled}
            onChange={(e) => setDoc((d) => ({ ...d, enabled: e.target.checked }))}
            className="rounded border-gray-300 w-4 h-4"
          />
          <span className="font-medium text-gray-900 dark:text-white">Show section on landing page</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            value={doc.title}
            onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period label</label>
          <input
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            placeholder="e.g. 01 April — 30 April"
            value={doc.periodLabel}
            onChange={(e) => setDoc((d) => ({ ...d, periodLabel: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
          <input
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            value={doc.subtitle}
            onChange={(e) => setDoc((d) => ({ ...d, subtitle: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display mode</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['structured', 'Table + chart'],
              ['split_images', 'Two screenshots'],
              ['full_image', 'Single infographic'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDoc((d) => ({ ...d, displayMode: id }))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                doc.displayMode === id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {doc.displayMode === 'structured' ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Column labels (comma-separated)
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
              value={columnsInput}
              onChange={(e) => setColumnsInput(e.target.value)}
              onBlur={() => syncColumnsFromInput()}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Rows</span>
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Name</th>
                  {colLabels.map((c) => (
                    <th key={c} className="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-400">
                      {c}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-4">
                      <input
                        className="w-full min-w-[120px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                        value={row.name}
                        onChange={(e) => updateRowName(ri, e.target.value)}
                      />
                    </td>
                    {colLabels.map((_, ci) => (
                      <td key={ci} className="py-2 px-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-24 text-right rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                          value={row.values[ci] !== undefined && row.values[ci] !== null ? String(row.values[ci]) : ''}
                          placeholder="0"
                          onChange={(e) => updateRowValue(ri, ci, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="py-2 pl-2">
                      <button
                        type="button"
                        onClick={() => removeRow(ri)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {doc.displayMode === 'split_images' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6"
            >
              <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 dark:text-white">
                <ImageIcon className="w-4 h-4" />
                {side === 'left' ? 'Left (table / data)' : 'Right (chart / summary)'}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                <Upload className="w-4 h-4" />
                Upload image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                      await uploadAsset(side, f);
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Upload failed');
                    }
                  }}
                />
              </label>
              {(side === 'left' ? doc.leftImageUrl : doc.rightImageUrl) ? (
                <img
                  src={resolveBackendAssetUrl(side === 'left' ? doc.leftImageUrl : doc.rightImageUrl)}
                  alt=""
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 mt-2"
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {doc.displayMode === 'full_image' ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6">
          <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 dark:text-white">
            <ImageIcon className="w-4 h-4" />
            Full infographic / poster
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
            <Upload className="w-4 h-4" />
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  await uploadAsset('full', f);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Upload failed');
                }
              }}
            />
          </label>
          {doc.fullImageUrl ? (
            <img
              src={resolveBackendAssetUrl(doc.fullImageUrl)}
              alt=""
              className="w-full max-h-[520px] object-contain rounded-xl border border-gray-200 dark:border-gray-600 mx-auto"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
