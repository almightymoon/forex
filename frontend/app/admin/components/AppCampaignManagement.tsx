'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Megaphone, X, Upload, Loader2, Archive, Send, Eye, Smartphone, Monitor } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import CampaignPopup from '../../../components/campaign/CampaignPopup';
import type { CampaignPreviewSource } from '../../../components/campaign/campaignDisplay';
import type { CampaignLayout, CampaignImageFit, CampaignImageHeight, AppCampaignCta } from '../../../lib/appCampaign';

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
  layout?: CampaignLayout;
  showTitle?: boolean;
  showBody?: boolean;
  showBadge?: boolean;
  showCtaButton?: boolean;
  imageClickable?: boolean;
  imageFit?: CampaignImageFit;
  imageHeight?: CampaignImageHeight;
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
  layout: 'standard',
  showTitle: true,
  showBody: true,
  showBadge: true,
  showCtaButton: true,
  imageClickable: false,
  imageFit: 'cover',
  imageHeight: 'medium',
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

function normalizePreviewCta(cta?: CampaignRecord['cta']): AppCampaignCta {
  const action = cta?.action;
  return {
    label: cta?.label?.trim() || 'Learn more',
    action:
      action === 'link' || action === 'route' || action === 'dismiss_only' ? action : 'dismiss_only',
    url: cta?.url || '',
    route: cta?.route || '',
  };
}

export default function AppCampaignManagement() {
  const [items, setItems] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRecord | null>(null);
  const [form, setForm] = useState<Partial<CampaignRecord>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'web' | 'mobile'>('web');

  const previewCampaign = useMemo(
    (): CampaignPreviewSource & Pick<CampaignRecord, 'campaignId' | 'version'> => ({
      campaignId: form.campaignId || 'preview',
      version: form.version || 1,
      title: form.title || 'Campaign title',
      body: form.body || '',
      badge: form.badge || '',
      imageUrl: form.imageUrl || '',
      cta: normalizePreviewCta(form.cta ?? emptyForm.cta),
      showDismissButton: form.showDismissButton,
      layout: form.layout || 'standard',
      showTitle: form.showTitle,
      showBody: form.showBody,
      showBadge: form.showBadge,
      showCtaButton: form.showCtaButton,
      imageClickable: form.imageClickable,
      imageFit: form.imageFit || 'cover',
      imageHeight: form.imageHeight || 'medium',
    }),
    [form],
  );

  const applyLayoutPreset = (layout: CampaignLayout) => {
    if (layout === 'image_only') {
      setForm((f) => ({
        ...f,
        layout,
        showTitle: false,
        showBody: false,
        showBadge: false,
        showCtaButton: false,
        showDismissButton: false,
        imageClickable: true,
        imageHeight: 'large',
      }));
      return;
    }
    if (layout === 'image_with_text') {
      setForm((f) => ({
        ...f,
        layout,
        showTitle: true,
        showBody: true,
        showBadge: true,
        showCtaButton: false,
        showDismissButton: true,
        imageClickable: false,
        imageHeight: 'medium',
      }));
      return;
    }
    if (layout === 'standard') {
      setForm((f) => ({
        ...f,
        layout,
        showTitle: true,
        showBody: true,
        showBadge: true,
        showCtaButton: true,
        showDismissButton: true,
        imageClickable: false,
        imageHeight: 'medium',
      }));
      return;
    }
    setForm((f) => ({ ...f, layout: 'custom' }));
  };

  const togglesLocked = form.layout === 'image_only' || form.layout === 'image_with_text';

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
    setForm({
      ...emptyForm,
      ...item,
      cta: { ...emptyForm.cta, ...item.cta },
      layout: item.layout || 'standard',
      showTitle: item.showTitle !== false,
      showBody: item.showBody !== false,
      showBadge: item.showBadge !== false,
      showCtaButton: item.showCtaButton !== false,
      imageClickable: item.imageClickable === true,
      imageFit: item.imageFit || 'cover',
      imageHeight: item.imageHeight || 'medium',
    });
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
    const platforms =
      form.platforms && form.platforms.length > 0 ? form.platforms : ['mobile', 'web'];
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
        body: JSON.stringify({ ...form, platforms }),
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
      showToast(
        action === 'publish'
          ? 'Published — popup is live and account holders are being notified'
          : 'Archived',
        'success',
      );
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
            className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editing ? 'Edit campaign' : 'New campaign'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Changes update the live preview instantly</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Basics</h4>
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
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Appearance</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-gray-500">Layout preset</span>
                      <select
                        value={form.layout || 'standard'}
                        onChange={(e) => applyLayoutPreset(e.target.value as CampaignLayout)}
                        className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                      >
                        <option value="standard">Standard — image, text, and buttons</option>
                        <option value="image_only">Image only — banner with close button</option>
                        <option value="image_with_text">Image + text — no action buttons</option>
                        <option value="custom">Custom — pick each element below</option>
                      </select>
                    </label>

                    <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                      <span className="text-xs font-semibold uppercase text-gray-500">Visible elements</span>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        {(
                          [
                            ['showTitle', 'Title'],
                            ['showBody', 'Message'],
                            ['showBadge', 'Badge'],
                            ['showCtaButton', 'Primary button'],
                            ['showDismissButton', '"Maybe later" link'],
                            ['imageClickable', 'Tap image opens link'],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={togglesLocked && key !== 'imageClickable'}
                              checked={form[key] !== false}
                              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      {togglesLocked ? (
                        <p className="mt-2 text-xs text-gray-500">
                          Switch to Custom to override individual toggles for this preset.
                        </p>
                      ) : null}
                    </div>

                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-500">Image height</span>
                      <select
                        value={form.imageHeight || 'medium'}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, imageHeight: e.target.value as CampaignImageHeight }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                      >
                        <option value="compact">Compact</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="auto">Fit image (auto)</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-500">Image fit</span>
                      <select
                        value={form.imageFit || 'cover'}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, imageFit: e.target.value as CampaignImageFit }))
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700"
                      >
                        <option value="cover">Cover (crop to fill)</option>
                        <option value="contain">Contain (show full image)</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Action button</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                </section>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Schedule &amp; targeting</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Platforms</span>
                <div className="mt-2 flex flex-wrap gap-4">
                  {(['mobile', 'web'] as const).map((platform) => {
                    const selected = (form.platforms || ['mobile', 'web']).includes(platform);
                    return (
                      <label key={platform} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const current = form.platforms || ['mobile', 'web'];
                            const next = e.target.checked
                              ? Array.from(new Set([...current, platform]))
                              : current.filter((p) => p !== platform);
                            setForm((f) => ({
                              ...f,
                              platforms: next.length ? next : [platform],
                            }));
                          }}
                        />
                        {platform === 'mobile' ? 'Mobile app' : 'Website'}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Include both for &quot;All&quot; audience so guests see the landing popup and app users see it in the app.
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Audience</span>
                <select
                  value={form.audience || 'authenticated'}
                  onChange={(e) => {
                    const audience = e.target.value;
                    setForm((f) => ({
                      ...f,
                      audience,
                      platforms:
                        audience === 'all'
                          ? Array.from(new Set([...(f.platforms || []), 'mobile', 'web']))
                          : f.platforms,
                    }));
                  }}
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
                  </div>
                </section>
              </div>

              <div className="lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live preview
                  </span>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('web')}
                      className={`px-2 py-1 flex items-center gap-1 ${previewDevice === 'web' ? 'bg-blue-600 text-white' : ''}`}
                    >
                      <Monitor className="h-3 w-3" />
                      Web
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-2 py-1 flex items-center gap-1 ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : ''}`}
                    >
                      <Smartphone className="h-3 w-3" />
                      Mobile
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center">
                  <div className={previewDevice === 'mobile' ? 'w-[280px]' : 'w-full max-w-sm'}>
                    <CampaignPopup campaign={previewCampaign} preview />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
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
