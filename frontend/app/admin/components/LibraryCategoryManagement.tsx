'use client';

import React, { useEffect, useState } from 'react';
import { Edit, FolderPlus, Loader2, Trash, X, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export type LibraryCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  itemCount?: number;
};

const emptyCategory = {
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
};

type Props = {
  onCategoriesChange?: () => void;
  apiBase?: string;
};

export default function LibraryCategoryManagement({
  onCategoriesChange,
  apiBase = 'api/admin/library-categories',
}: Props) {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LibraryCategory | null>(null);
  const [form, setForm] = useState(emptyCategory);
  const [deleteTarget, setDeleteTarget] = useState<LibraryCategory | null>(null);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(apiBase), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCategory);
    setShowModal(true);
  };

  const openEdit = (cat: LibraryCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive !== false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editing
        ? buildApiUrl(`${apiBase}/${editing._id}`)
        : buildApiUrl(apiBase);
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save category', 'error');
        return;
      }
      showToast(editing ? 'Category updated' : 'Category created', 'success');
      setShowModal(false);
      fetchCategories();
      onCategoriesChange?.();
    } catch {
      showToast('Failed to save category', 'error');
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
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete category', 'error');
        return;
      }
      showToast('Category deleted', 'success');
      setDeleteTarget(null);
      fetchCategories();
      onCategoriesChange?.();
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Library categories</h3>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <FolderPlus className="h-4 w-4" />
          Add category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No categories yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {categories.map((cat) => (
                <tr key={cat._id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{cat.itemCount ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{cat.sortOrder ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{cat.isActive !== false ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(cat)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(cat)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-1">
                      <Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit category' : 'New category'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="mb-4">Delete category &quot;{deleteTarget.name}&quot;?</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
