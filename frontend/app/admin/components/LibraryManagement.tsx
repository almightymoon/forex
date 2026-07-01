'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash,
  BookOpen,
  X,
  AlertTriangle,
  Upload,
  Loader2,
  Search,
  FolderTree,
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import LibraryCategoryManagement, { type LibraryCategory } from './LibraryCategoryManagement';

type LibraryItemRecord = {
  _id: string;
  itemId: string;
  title: string;
  status: string;
  description?: string;
  resourceType: string;
  externalUrl?: string;
  fileUrl?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  allowedPackages?: number[] | null;
  author?: string;
  sortOrder?: number;
};

type PackageOption = {
  name: string;
  price: number;
  isActive?: boolean;
};

type LibraryManagementProps = {
  apiBase?: string;
  categoriesApiBase?: string;
};

const RESOURCE_TYPES = [
  { value: 'link', label: 'Link' },
  { value: 'google_sheet', label: 'Google Sheet' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Document' },
  { value: 'book', label: 'Book' },
  { value: 'video', label: 'Video' },
];

const emptyItem: Partial<LibraryItemRecord> = {
  itemId: '',
  title: '',
  status: 'draft',
  description: '',
  resourceType: 'link',
  externalUrl: '',
  fileUrl: '',
  coverImage: '',
  category: '',
  tags: [],
  allowedPackages: null,
  author: '',
  sortOrder: 0,
};

function formatPackageLabel(allowedPackages: number[] | null | undefined, packages: PackageOption[]) {
  if (allowedPackages === null || allowedPackages === undefined) return 'All packages';
  if (!Array.isArray(allowedPackages) || allowedPackages.length === 0) return 'All packages';
  const byPrice = Object.fromEntries(packages.map((p) => [p.price, p.name]));
  return allowedPackages.map((p) => byPrice[p] || `$${p}`).join(', ');
}

export default function LibraryManagement({
  apiBase = 'api/admin/library',
  categoriesApiBase = 'api/admin/library-categories',
}: LibraryManagementProps) {
  const [sectionTab, setSectionTab] = useState<'items' | 'categories'>('items');
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [items, setItems] = useState<LibraryItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LibraryItemRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryItemRecord | null>(null);
  const [form, setForm] = useState<Partial<LibraryItemRecord>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [packages, setPackages] = useState<PackageOption[]>([]);

  const fetchPackages = async () => {
    try {
      const res = await fetch(buildApiUrl('api/packages'), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.packages || [];
        setPackages(
          list
            .filter((p: PackageOption) => p.isActive !== false)
            .map((p: PackageOption) => ({ name: p.name, price: p.price }))
            .sort((a: PackageOption, b: PackageOption) => a.price - b.price)
        );
      }
    } catch {
      setPackages([
        { name: 'FX Launch', price: 100 },
        { name: 'FX Scale', price: 250 },
        { name: 'FX Legacy', price: 1000 },
      ]);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(categoriesApiBase), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      /* non-blocking */
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(buildApiUrl(`${apiBase}?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      showToast('Failed to load library items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchPackages();
  }, [search, statusFilter]);

  const openAdd = () => {
    setForm({ ...emptyItem });
    setTagsInput('');
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (item: LibraryItemRecord) => {
    setForm({ ...item, tags: item.tags || [] });
    setTagsInput((item.tags || []).join(', '));
    setEditing(item);
    setShowModal(true);
  };

  const uploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    endpoint: 'upload-cover' | 'upload-file',
    field: 'coverImage' | 'fileUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading = field === 'coverImage' ? setUploadingCover : setUploadingFile;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(buildApiUrl(`${apiBase}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({ ...prev, [field]: data.url }));
        showToast('Upload successful', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemId?.trim() || !form.title?.trim()) {
      showToast('Item ID and title are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      };
      const url = editing
        ? buildApiUrl(`${apiBase}/${editing._id}`)
        : buildApiUrl(apiBase);
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save', 'error');
        return;
      }
      showToast(editing ? 'Item updated' : 'Item created', 'success');
      setShowModal(false);
      fetchItems();
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`${apiBase}/${deleteTarget._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'error');
        return;
      }
      showToast('Item deleted', 'success');
      setDeleteTarget(null);
      fetchItems();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          type="button"
          onClick={() => setSectionTab('items')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${sectionTab === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
        >
          <BookOpen className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Resources
        </button>
        <button
          type="button"
          onClick={() => setSectionTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${sectionTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
        >
          <FolderTree className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Categories
        </button>
      </div>

      {sectionTab === 'categories' ? (
        <LibraryCategoryManagement
          onCategoriesChange={fetchCategories}
          apiBase={categoriesApiBase}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex flex-wrap gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search library…"
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-sm"
              >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add resource
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No library items yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Packages</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.itemId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.resourceType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatPackageLabel(item.allowedPackages, packages)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1">
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 my-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{editing ? 'Edit resource' : 'New resource'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item ID (slug)</label>
                  <input
                    value={form.itemId || ''}
                    onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    disabled={!!editing}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={form.status || 'draft'}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  value={form.title || ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Resource type</label>
                  <select
                    value={form.resourceType || 'link'}
                    onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={form.category || ''}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">— None —</option>
                    {categories.filter((c) => c.isActive !== false).map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Available for packages</label>
                <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowedPackages === null || form.allowedPackages === undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm((f) => ({ ...f, allowedPackages: null }));
                        } else {
                          setForm((f) => ({ ...f, allowedPackages: [] }));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      All packages (any subscriber)
                    </span>
                  </label>
                  <div className="ml-6 space-y-2">
                    {packages.map((pkg) => {
                      const isForAll = form.allowedPackages === null || form.allowedPackages === undefined;
                      const isChecked =
                        Array.isArray(form.allowedPackages) && form.allowedPackages.includes(pkg.price);
                      return (
                        <label key={pkg.price} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isForAll}
                            onChange={(e) => {
                              const current = Array.isArray(form.allowedPackages) ? form.allowedPackages : [];
                              if (e.target.checked) {
                                setForm((f) => ({
                                  ...f,
                                  allowedPackages: [...current, pkg.price],
                                }));
                              } else {
                                const next = current.filter((p) => p !== pkg.price);
                                setForm((f) => ({
                                  ...f,
                                  allowedPackages: next.length > 0 ? next : null,
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 disabled:opacity-50"
                          />
                          <span className={`text-sm ${isForAll ? 'opacity-50' : ''} text-gray-700 dark:text-gray-300`}>
                            {pkg.name} (${pkg.price})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uncheck &quot;All packages&quot; to restrict this resource to specific tiers. Only students on those packages will see it in the library.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">External URL (Google Sheet, link, book, video)</label>
                <input
                  type="url"
                  value={form.externalUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                  placeholder="https://docs.google.com/..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File URL (PDF / document)</label>
                <div className="flex gap-2">
                  <input
                    value={form.fileUrl || ''}
                    onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                    placeholder="/uploads/library/..."
                  />
                  <label className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg cursor-pointer text-sm bg-gray-50 dark:bg-gray-700">
                    <Upload className="h-4 w-4" />
                    {uploadingFile ? '…' : 'Upload'}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={(e) => uploadFile(e, 'upload-file', 'fileUrl')} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cover image (optional)</label>
                <div className="flex gap-2">
                  <input
                    value={form.coverImage || ''}
                    onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  />
                  <label className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg cursor-pointer text-sm bg-gray-50 dark:bg-gray-700">
                    <Upload className="h-4 w-4" />
                    {uploadingCover ? '…' : 'Upload'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => uploadFile(e, 'upload-cover', 'coverImage')} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Author</label>
                  <input
                    value={form.author || ''}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="journal, template, pdf"
                />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update resource' : 'Create resource'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="mb-4">Delete &quot;{deleteTarget.title}&quot;?</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
