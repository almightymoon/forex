'use client';

import React, { useEffect, useState } from 'react';
import { Edit, FolderPlus, Loader2, Trash, X, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export type ShopCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  productCount?: number;
};

const emptyCategory = {
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
};

type Props = {
  onCategoriesChange?: () => void;
};

export default function ShopCategoryManagement({ onCategoriesChange }: Props) {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShopCategory | null>(null);
  const [form, setForm] = useState(emptyCategory);
  const [deleteTarget, setDeleteTarget] = useState<ShopCategory | null>(null);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/product-categories'), {
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

  const openEdit = (cat: ShopCategory) => {
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
      const url = buildApiUrl(
        editing ? `api/admin/product-categories/${editing._id}` : 'api/admin/product-categories'
      );
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
      await fetchCategories();
      onCategoriesChange?.();
    } catch {
      showToast('Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/product-categories/${deleteTarget._id}`), {
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
      await fetchCategories();
      onCategoriesChange?.();
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Shop categories</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create categories for organizing products in the shop.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          Create category
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No categories yet. Create one to assign products in the shop.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Slug</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Products</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Order</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                    {cat.description ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{cat.description}</p>
                    ) : null}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{cat.slug}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{cat.productCount ?? 0}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{cat.sortOrder ?? 0}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cat.isActive !== false
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {cat.isActive !== false ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Edit category' : 'Create category'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Trading Tools"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional short description for internal reference"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={form.isActive ? 'active' : 'hidden'}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'active' }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete category</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Delete <strong>{deleteTarget.name}</strong>?
                {(deleteTarget.productCount ?? 0) > 0
                  ? ' Reassign its products first — deletion is blocked while products use this category.'
                  : ' This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={(deleteTarget.productCount ?? 0) > 0}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
