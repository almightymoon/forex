'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Upload, Users2, ChevronUp, ChevronDown } from 'lucide-react';
import { apiRequest, buildApiUrl, clearCache } from '../utils/api';
import { resolveBackendAssetUrl } from '../lib/resolveBackendAssetUrl';

export type JoinerRow = {
  name: string;
  country: string;
  pkg: string;
  imageUrl: string;
  accentBg: string;
};

type Doc = {
  enabled: boolean;
  joiners: JoinerRow[];
};

const ACCENTS = ['#0d9488', '#ea580c', '#2563eb', '#0891b2', '#7c3aed', '#c41e3a', '#d4a012', '#1e3a5f'];

const emptyDoc: Doc = {
  enabled: false,
  joiners: [],
};

type Props = {
  apiRoot: string;
};

export default function NewJoinersLandingEditor({ apiRoot }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<Doc>(emptyDoc);
  const [error, setError] = useState<string | null>(null);

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
        enabled: Boolean(d.enabled),
        joiners: Array.isArray(d.joiners)
          ? d.joiners.map((j, i) => ({
              name: String(j?.name ?? ''),
              country: String(j?.country ?? ''),
              pkg: String(j?.pkg ?? ''),
              imageUrl: String(j?.imageUrl ?? ''),
              accentBg: String(j?.accentBg ?? ACCENTS[i % ACCENTS.length]),
            }))
          : [],
      };
      setDoc(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiRoot]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest(
        apiRoot,
        {
          method: 'PUT',
          body: JSON.stringify({ enabled: doc.enabled, joiners: doc.joiners }),
        },
        false,
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      clearCache(apiRoot);
      clearCache('api/new-joiners/public');
      if (json.data) {
        const d = json.data as Partial<Doc>;
        setDoc({
          ...emptyDoc,
          ...d,
          joiners: Array.isArray(d.joiners) ? (d.joiners as JoinerRow[]) : doc.joiners,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateJoiner = (idx: number, patch: Partial<JoinerRow>) => {
    setDoc((d) => ({
      ...d,
      joiners: d.joiners.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const addJoiner = () => {
    setDoc((d) => ({
      ...d,
      joiners: [
        ...d.joiners,
        {
          name: '',
          country: '',
          pkg: '',
          imageUrl: '',
          accentBg: ACCENTS[d.joiners.length % ACCENTS.length],
        },
      ],
    }));
  };

  const removeJoiner = (idx: number) => {
    setDoc((d) => ({ ...d, joiners: d.joiners.filter((_, i) => i !== idx) }));
  };

  const moveJoiner = (idx: number, dir: -1 | 1) => {
    setDoc((d) => {
      const next = [...d.joiners];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return d;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...d, joiners: next };
    });
  };

  const uploadPhoto = async (idx: number, file: File) => {
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
    const url = typeof json.url === 'string' ? json.url : '';
    if (!res.ok || !url) throw new Error(json.error || 'Upload failed');
    updateJoiner(idx, { imageUrl: url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading new joiners…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <Users2 className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Landing: new joiners</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Manage the profile cards above “What Our Customers Say”. Each entry shows name, country, and package on the
            home page. Upload a portrait or paste an image URL; set a fallback accent color behind the photo.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={doc.enabled}
          onChange={(e) => setDoc((d) => ({ ...d, enabled: e.target.checked }))}
          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Show “New joiners” section on the landing page
        </span>
      </label>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Members ({doc.joiners.length})</h3>
          <button
            type="button"
            onClick={addJoiner}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Add member
          </button>
        </div>

        {doc.joiners.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
            No members yet. Click “Add member” or enable the section after adding at least one row with a name.
          </p>
        ) : (
          <div className="space-y-6">
            {doc.joiners.map((row, idx) => (
              <div
                key={`joiner-${idx}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Member {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => moveJoiner(idx, -1)}
                      disabled={idx === 0}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => moveJoiner(idx, 1)}
                      disabled={idx === doc.joiners.length - 1}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => removeJoiner(idx)}
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                    <input
                      value={row.name}
                      onChange={(e) => updateJoiner(idx, { name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                      placeholder="Jordan Ellis"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
                    <input
                      value={row.country}
                      onChange={(e) => updateJoiner(idx, { country: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                      placeholder="United Kingdom"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Package</label>
                    <input
                      value={row.pkg}
                      onChange={(e) => updateJoiner(idx, { pkg: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                      placeholder="Professional Package"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Accent (hex)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={row.accentBg.match(/^#[0-9a-fA-F]{6}$/) ? row.accentBg : '#0d9488'}
                        onChange={(e) => updateJoiner(idx, { accentBg: e.target.value })}
                        className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        value={row.accentBg}
                        onChange={(e) => updateJoiner(idx, { accentBg: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-mono"
                        placeholder="#0d9488"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Photo URL
                    </label>
                    <input
                      value={row.imageUrl}
                      onChange={(e) => updateJoiner(idx, { imageUrl: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                      placeholder="/uploads/... or https://..."
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
                    <Upload className="w-4 h-4" />
                    Upload portrait
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(idx, f).catch((err) => setError(err instanceof Error ? err.message : 'Upload failed'));
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {row.imageUrl ? (
                    <img
                      src={resolveBackendAssetUrl(row.imageUrl)}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Public payload (cached): <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/new-joiners/public</code>{' '}
        · Section anchor <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">#new-joiners</code>
      </p>
    </div>
  );
}
