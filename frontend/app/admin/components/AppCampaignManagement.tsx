'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Megaphone, X, Upload, Loader2, Archive, Send } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

type CampaignRecord = {
  _id: string;
  campaignId: string;
  name: string;
  status: string;
  title: string;
  body?: string;
  badge?: string;
  imageUrl?: string;
  cta?: { label?: string; action?: string; url?: string; route?: string };
  showDismissButton?: boolean;
  dismissMode?: string;
  startAt: string;
  endAt: string;
  platforms?: string[];
  audience?: string;
  allowedPackages?: number[] | null;
  frequency?: string;
  priority?: number;
  version?: number;
};

const emptyForm: Partial<CampaignRecord> = {
  campaignId: '',
  name: '',
  status: 'draft',
  title: '',
  body: '',
  badge: '',
  imageUrl: '',
  cta: { label: 'Shop now', action: 'route', route: '/shop', url: '' },
  showDismissButton: true,
  dismissMode: 'campaign',
  platforms: ['mobile', 'web'],
  audience: 'authenticated',
  allowedPackages: null,
  frequency: 'once_per_session',
  priority: 0,
};

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppCampaignManagement() {
  const [items, setItems] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [form, setForm] = useState<Partial<CampaignRecord>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/campaigns'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreate = () => {
    setEditing(null);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    setForm({
      ...emptyForm,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
    setModalOpen(true);
  };

  const openEdit = (item: CampaignRecord) => {
    setEditing(item);
    setForm({ ...item, cta: { ...emptyForm.cta, ...item.cta } });
    setModalOpen(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(buildApiUrl('api/admin/campaigns/upload-image'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((f) => ({ ...f, imageUrl: data.url }));
        showToast('Image uploaded', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.campaignId || !form.name || !form.title || !form.startAt || !form.endAt) {
      showToast('Campaign ID, name, title, and schedule are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editing
        ? buildApiUrl(`api/admin/campaigns/${editing._id}`)
        : buildApiUrl('api/admin/campaigns');
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editing ? 'Campaign updated' : 'Campaign created', 'success');
        setModalOpen(false);
        fetchItems();
      } else {
        showToast(data.error || 'Save failed', 'error');
      }
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, action: 'publish' | 'archive') => {
    const token = localStorage.getItem('token');
    const res = await fetch(buildApiUrl(`api/admin/campaigns/${id}/${action}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast(action === 'publish' ? 'Published' : 'Archived', 'success');
      fetchItems();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(buildApiUrl(`api/admin/campaigns/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Deleted', 'success');
      fetchItems();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-blue-600" />
            App campaigns
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shopping-style popups on mobile and web — schedule discounts, holidays, and promos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center text-gray-500">
          No campaigns yet. Create one to show a promo popup when users open the app.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 font-semibold">Platforms</th>
                <th className="px-4 py-3 font-semibold">Audience</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.title}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(item.startAt).toLocaleString()} — {new Date(item.endAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{(item.platforms || []).join(', ')}</td>
                  <td className="px-4 py-3">{item.audience}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                        item.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'archived'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEdit(item)} className="text-blue-600 hover:underline">
                        <Edit className="h-4 w-4 inline" />
                      </button>
                      {item.status !== 'published' ? (
                        <button type="button" onClick={() => setStatus(item._id, 'publish')} title="Publish">
                          <Send className="h-4 w-4 text-green-600" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setStatus(item._id, 'archive')} title="Archive">
                          <Archive className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                      <button type="button" onClick={() => remove(item._id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit campaign' : 'New campaign'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="text-xs font-semibold uppercase text-gray-500">Campaign ID</span>
                <input
                  disabled={!!editing}
                  value={form.campaignId || ''}
                  onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value.toLowerCase() }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                  placeholder="eid-2026"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs font-semibold uppercase text-gray-500">Internal name</span>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Popup title</span>
                <input
                  value={form.title || ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Message</span>
                <textarea
                  rows={3}
                  value={form.body || ''}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Badge (e.g. 20% OFF)</span>
                <input
                  value={form.badge || ''}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Priority</span>
                <input
                  type="number"
                  value={form.priority ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Image URL</span>
                <div className="mt-1 flex gap-2">
                  <input
                    value={form.imageUrl || ''}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="flex-1 rounded-lg border px-3 py-2 dark:bg-gray-700"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                    <Upload className="h-4 w-4" />
                    {uploading ? '…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                      }}
                    />
                  </label>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Start</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(form.startAt)}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: new Date(e.target.value).toISOString() }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">End</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(form.endAt)}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: new Date(e.target.value).toISOString() }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Platforms</span>
                <select
                  multiple
                  value={form.platforms || ['mobile', 'web']}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      platforms: Array.from(e.target.selectedOptions).map((o) => o.value),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700 h-20"
                >
                  <option value="mobile">Mobile</option>
                  <option value="web">Web</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Audience</span>
                <select
                  value={form.audience || 'authenticated'}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                >
                  <option value="all">All</option>
                  <option value="guest">Guests only</option>
                  <option value="authenticated">Signed-in users</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Show frequency</span>
                <select
                  value={form.frequency || 'once_per_session'}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                >
                  <option value="once_per_session">Once per app session</option>
                  <option value="once_per_day">Once per day</option>
                  <option value="every_open">Every app open</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Dismiss behavior</span>
                <select
                  value={form.dismissMode || 'campaign'}
                  onChange={(e) => setForm((f) => ({ ...f, dismissMode: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                >
                  <option value="session">Hide until next session</option>
                  <option value="day">Hide for 24 hours</option>
                  <option value="campaign">Don&apos;t show again (this version)</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-gray-500">Button label</span>
                <input
                  value={form.cta?.label || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cta: { ...f.cta!, label: e.target.value } }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Button action</span>
                <select
                  value={form.cta?.action || 'dismiss_only'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cta: { ...f.cta!, action: e.target.value } }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                >
                  <option value="dismiss_only">Close only</option>
                  <option value="route">In-app route</option>
                  <option value="link">External link</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {form.cta?.action === 'link' ? 'URL' : 'Route'}
                </span>
                <input
                  value={
                    form.cta?.action === 'link' ? form.cta?.url || '' : form.cta?.route || ''
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cta:
                        f.cta?.action === 'link'
                          ? { ...f.cta!, url: e.target.value }
                          : { ...f.cta!, route: e.target.value },
                    }))
                  }
                  placeholder={form.cta?.action === 'link' ? 'https://…' : '/shop or /(app)/shop'}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
