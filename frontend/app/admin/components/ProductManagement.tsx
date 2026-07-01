'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash,
  Package,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Loader2,
  Search,
  FolderTree
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import ShopCategoryManagement, { type ShopCategory } from './ShopCategoryManagement';

interface Product {
  _id: string;
  productId: string;
  name: string;
  status: string;
  shortDescription?: string;
  longDescription?: string;
  outcomePromise?: string;
  category?: string;
  tags?: string[];
  primaryImage?: string;
  galleryImages?: string[];
  requirements?: string;
  currentVersion?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  stripeProductId?: string;
  price?: number;
  deliveryUrl?: string;
  updatedAt?: string;
}

const emptyProduct: Partial<Product> = {
  productId: '',
  name: '',
  status: 'draft',
  shortDescription: '',
  longDescription: '',
  outcomePromise: '',
  category: '',
  tags: [],
  primaryImage: '',
  galleryImages: [],
  requirements: '',
  currentVersion: 'v1.0',
  seoTitle: '',
  seoMetaDescription: '',
  stripeProductId: '',
  price: 0,
  deliveryUrl: ''
};

export default function ProductManagement() {
  const [sectionTab, setSectionTab] = useState<'products' | 'categories'>('products');
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

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
      /* non-blocking */
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const url = buildApiUrl(`api/admin/products?${params.toString()}`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, statusFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, products.length]);

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p._id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const token = localStorage.getItem('token');
      let ok = 0;
      for (const id of ids) {
        const res = await fetch(buildApiUrl(`api/admin/products/${id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });
        if (res.ok) ok += 1;
      }
      showToast(`Updated ${ok} of ${ids.length} product(s)`, ok === ids.length ? 'success' : 'error');
      setSelectedIds(new Set());
      fetchProducts();
    } catch {
      showToast('Bulk update failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    setShowBulkDeleteConfirm(false);
    try {
      const token = localStorage.getItem('token');
      let ok = 0;
      for (const id of ids) {
        const res = await fetch(buildApiUrl(`api/admin/products/${id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) ok += 1;
      }
      showToast(`Deleted ${ok} of ${ids.length} product(s)`, ok === ids.length ? 'success' : 'error');
      setSelectedIds(new Set());
      fetchProducts();
    } catch {
      showToast('Bulk delete failed', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const openAddModal = () => {
    setForm({ ...emptyProduct });
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setForm({
      ...p,
      tags: p.tags || [],
      galleryImages: p.galleryImages || []
    });
    setEditingProduct(p);
    setShowModal(true);
  };

  const handleUploadPrimary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrimary(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(buildApiUrl('api/admin/products/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({ ...prev, primaryImage: data.url }));
        showToast('Primary image uploaded', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingPrimary(false);
      e.target.value = '';
    }
  };

  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(buildApiUrl('api/admin/products/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), data.url]
        }));
        showToast('Gallery image added', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      galleryImages: (prev.galleryImages || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId?.trim() || !form.name?.trim()) {
      showToast('Product ID and name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = buildApiUrl(editingProduct ? `api/admin/products/${editingProduct._id}` : 'api/admin/products');
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          productId: editingProduct ? undefined : form.productId?.toLowerCase().trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(editingProduct ? 'Product updated' : 'Product created', 'success');
        setShowModal(false);
        fetchProducts();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/products/${productToDelete._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Product deleted', 'success');
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        fetchProducts();
      } else {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com/api';
    const root = base.replace(/\/api\/?$/, '');
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
        <button
          type="button"
          onClick={() => setSectionTab('products')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            sectionTab === 'products'
              ? 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border border-b-0 border-gray-200 dark:border-gray-700'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setSectionTab('categories')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            sectionTab === 'categories'
              ? 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border border-b-0 border-gray-200 dark:border-gray-700'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Categories
        </button>
      </div>

      {sectionTab === 'categories' ? (
        <ShopCategoryManagement onCategoriesChange={fetchCategories} />
      ) : (
      <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Products</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 mb-6">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateStatus('published')}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateStatus('draft')}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => bulkUpdateStatus('archived')}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={bulkBusy}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                      aria-label="Select all products"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Updated</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p._id)}
                        onChange={() => toggleSelect(p._id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {p.primaryImage ? (
                          <img
                            src={getImageUrl(p.primaryImage)}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.productId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          p.status === 'published'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : p.status === 'archived'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{p.category || '-'}</td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {p.price != null ? `$${p.price}` : '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setProductToDelete(p);
                            setShowDeleteConfirm(true);
                          }}
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
            {products.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No products yet. Click &quot;Add Product&quot; to create one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product ID *</label>
                  <input
                    type="text"
                    value={form.productId || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                    placeholder="e.g. iso19650-bep-template-pack"
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={!!editingProduct}
                  />
                  {editingProduct && (
                    <p className="text-xs text-gray-500 mt-1">Product ID cannot be changed</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Product name"
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status || 'draft'}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price ?? 0}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Short description</label>
                <input
                  type="text"
                  value={form.shortDescription || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Brief summary"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Long description</label>
                <textarea
                  value={form.longDescription || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, longDescription: e.target.value }))}
                  placeholder="Full description..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcome / Promise</label>
                <input
                  type="text"
                  value={form.outcomePromise || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, outcomePromise: e.target.value }))}
                  placeholder="e.g. Write a credible BEP in hours, not days"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={form.category || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">No category</option>
                    {categories
                      .filter((c) => c.isActive !== false)
                      .map((c) => (
                        <option key={c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    {form.category &&
                    !categories.some((c) => c.name === form.category) ? (
                      <option value={form.category}>{form.category} (legacy)</option>
                    ) : null}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSectionTab('categories');
                    }}
                    className="mt-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:underline"
                  >
                    + Create category
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={(form.tags || []).join(', ')}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                      }))
                    }
                    placeholder="ISO 19650, BEP, MIDP"
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requirements</label>
                <input
                  type="text"
                  value={form.requirements || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  placeholder="e.g. Word/Google Docs + basic ISO 19650 familiarity"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current version</label>
                  <input
                    type="text"
                    value={form.currentVersion || 'v1.0'}
                    onChange={(e) => setForm((prev) => ({ ...prev, currentVersion: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe product ID</label>
                  <input
                    type="text"
                    value={form.stripeProductId || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, stripeProductId: e.target.value }))}
                    placeholder="prod_XXXX"
                    className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary image</label>
                <div className="flex items-center gap-3">
                  {form.primaryImage ? (
                    <div className="relative">
                      <img
                        src={getImageUrl(form.primaryImage)}
                        alt="Primary"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, primaryImage: '' }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <label className="cursor-pointer px-4 py-2 border border-dashed rounded-xl flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {uploadingPrimary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingPrimary ? 'Uploading...' : 'Upload primary image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadPrimary}
                      disabled={uploadingPrimary}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gallery images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.galleryImages || []).map((url, i) => (
                    <div key={i} className="relative">
                      <img src={getImageUrl(url)} alt="" className="w-16 h-16 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-dashed rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingGallery ? 'Uploading...' : 'Add gallery image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadGallery}
                    disabled={uploadingGallery}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery URL</label>
                <input
                  type="url"
                  value={form.deliveryUrl || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, deliveryUrl: e.target.value }))}
                  placeholder="https://... (download link after purchase)"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO title</label>
                <input
                  type="text"
                  value={form.seoTitle || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="SEO-optimized title"
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO meta description</label>
                <textarea
                  value={form.seoMetaDescription || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, seoMetaDescription: e.target.value }))}
                  placeholder="Meta description for search engines"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
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
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Product</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Delete <strong>{productToDelete.name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bulk delete confirmation */}
      {showBulkDeleteConfirm && selectedIds.size > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Products</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Delete {selectedIds.size} selected product{selectedIds.size === 1 ? '' : 's'}? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={bulkBusy}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkBusy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </motion.div>
  );
}
