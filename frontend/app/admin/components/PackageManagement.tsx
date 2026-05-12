'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { useToast } from '../../../components/Toast';

type CommissionRates = { 1: number; 2: number; 3: number; 4: number; 5: number };

export interface AdminPackage {
  _id: string;
  name: string;
  subtitle?: string;
  price: number;
  currency?: string;
  features?: string[];
  image?: string;
  isActive: boolean;
  sortOrder?: number;
  packageCommissionEnabled?: boolean;
  referralPoolPercentage?: number;
  commissionRates?: Partial<CommissionRates>;
  monthlyFeeReferralPoolPercentage?: number | null;
  monthlyFeeCommissionRates?: Partial<CommissionRates> | null;
  minWithdrawalAmount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type RedistributePreviewRow = {
  paymentId: string;
  createdAt: string;
  buyerEmail?: string;
  buyerName?: string;
  netPaid: number;
  oldTotalOpen: number;
  newTotal: number;
  deltaReferrerPayout: number;
  skipReason: string | null;
  newLevels: Array<{
    level: number;
    amount: number;
    rateOfPoolDisplay: string;
    payTo: { email: string; name: string };
  }>;
  oldOpenCommissions: Array<{ transactionId: string; level: string; amount: number }>;
};

export type RedistributePreviewData = {
  packageName: string;
  scanned: number;
  rows: RedistributePreviewRow[];
};

const REDISTRIBUTE_SKIP_LABELS: Record<string, string> = {
  invalid_or_zero_amount: 'Invalid or zero payment amount',
  commission_disabled_or_zero_pool: 'Commission disabled or zero pool under preview rules',
  buyer_not_found: 'Buyer user missing',
  no_referrer: 'Buyer has no referrer',
  default_referral_only: 'Default referral link only',
  zero_payout_chain: 'No payable upline or zero rates'
};

interface Props {
  packages: AdminPackage[];
  onRefresh?: () => void;
}

const defaultRates: CommissionRates = { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 };

function toRates(input: Partial<CommissionRates> | undefined): CommissionRates {
  const r = input || {};
  return {
    1: typeof r[1] === 'number' ? r[1] : defaultRates[1],
    2: typeof r[2] === 'number' ? r[2] : defaultRates[2],
    3: typeof r[3] === 'number' ? r[3] : defaultRates[3],
    4: typeof r[4] === 'number' ? r[4] : defaultRates[4],
    5: typeof r[5] === 'number' ? r[5] : defaultRates[5]
  };
}

export default function PackageManagement({ packages, onRefresh }: Props) {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminPackage | null>(null);
  const [editing, setEditing] = useState<AdminPackage | null>(null);

  const [redistributeOpen, setRedistributeOpen] = useState(false);
  const [redistributeLoading, setRedistributeLoading] = useState(false);
  const [redistributeApplyLoading, setRedistributeApplyLoading] = useState(false);
  const [redistributePreview, setRedistributePreview] = useState<RedistributePreviewData | null>(null);
  const [redistributeLimit, setRedistributeLimit] = useState(100);
  const [redistributeUseFormProposed, setRedistributeUseFormProposed] = useState(true);
  const [redistributeSelectedIds, setRedistributeSelectedIds] = useState<Set<string>>(new Set());
  const [redistributeConfirm, setRedistributeConfirm] = useState(false);

  const sorted = useMemo(
    () =>
      [...(packages || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
      ),
    [packages]
  );

  const [form, setForm] = useState({
    name: '',
    subtitle: '',
    price: 0,
    currency: 'USD',
    image: '',
    isActive: true,
    sortOrder: 0,
    packageCommissionEnabled: true,
    referralPoolPercentage: 0,
    commissionRates: defaultRates as CommissionRates,
    monthlyFeeReferralPoolPercentage: null as number | null,
    monthlyFeeCommissionRates: defaultRates as CommissionRates,
    minWithdrawalAmount: null as number | null,
    featuresText: ''
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      subtitle: '',
      price: 0,
      currency: 'USD',
      image: '',
      isActive: true,
      sortOrder: (sorted[sorted.length - 1]?.sortOrder ?? sorted.length) + 1,
      packageCommissionEnabled: true,
      referralPoolPercentage: 0,
      commissionRates: defaultRates,
      monthlyFeeReferralPoolPercentage: null,
      monthlyFeeCommissionRates: defaultRates,
      minWithdrawalAmount: null,
      featuresText: ''
    });
    setShowModal(true);
  };

  const openEdit = (p: AdminPackage) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      subtitle: p.subtitle || '',
      price: Number(p.price ?? 0),
      currency: p.currency || 'USD',
      image: p.image || '',
      isActive: !!p.isActive,
      sortOrder: Number(p.sortOrder ?? 0),
      packageCommissionEnabled: p.packageCommissionEnabled !== false,
      referralPoolPercentage: Number(p.referralPoolPercentage ?? 0),
      commissionRates: toRates(p.commissionRates),
      monthlyFeeReferralPoolPercentage:
        typeof p.monthlyFeeReferralPoolPercentage === 'number' ? Number(p.monthlyFeeReferralPoolPercentage) : null,
      monthlyFeeCommissionRates: toRates(
        (p.monthlyFeeCommissionRates as Partial<CommissionRates> | undefined) ?? (p.commissionRates as any)
      ),
      minWithdrawalAmount:
        typeof p.minWithdrawalAmount === 'number' && Number.isFinite(p.minWithdrawalAmount)
          ? Number(p.minWithdrawalAmount)
          : null,
      featuresText: (p.features || []).join('\n')
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const save = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        name: form.name.trim(),
        subtitle: form.subtitle.trim(),
        price: Number(form.price),
        currency: (form.currency || 'USD').trim(),
        image: form.image.trim(),
        isActive: !!form.isActive,
        sortOrder: Number(form.sortOrder),
        packageCommissionEnabled: !!form.packageCommissionEnabled,
        referralPoolPercentage: Number(form.referralPoolPercentage),
        commissionRates: form.commissionRates,
        monthlyFeeReferralPoolPercentage:
          typeof form.monthlyFeeReferralPoolPercentage === 'number'
            ? Number(form.monthlyFeeReferralPoolPercentage)
            : null,
        monthlyFeeCommissionRates: form.monthlyFeeCommissionRates,
        minWithdrawalAmount:
          typeof form.minWithdrawalAmount === 'number' && Number.isFinite(form.minWithdrawalAmount)
            ? Number(form.minWithdrawalAmount)
            : null,
        features: form.featuresText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      };

      const url = editing ? `api/admin/packages/${editing._id}` : 'api/admin/packages';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(buildApiUrl(url), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to save package', 'error');
        return;
      }

      showToast(editing ? 'Package updated' : 'Package created', 'success');
      closeModal();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Save package error:', e);
      showToast('Failed to save package', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (p: AdminPackage) => setDeleteTarget(p);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/packages/${deleteTarget._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to delete package', 'error');
        return;
      }
      showToast('Package deleted', 'success');
      setDeleteTarget(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Delete package error:', e);
      showToast('Failed to delete package', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openRedistributeFromEdit = () => {
    if (!editing) return;
    setRedistributeOpen(true);
    setRedistributePreview(null);
    setRedistributeSelectedIds(new Set());
    setRedistributeConfirm(false);
    setRedistributeUseFormProposed(true);
  };

  const fetchRedistributePreview = async () => {
    if (!editing) return;
    try {
      setRedistributeLoading(true);
      const token = localStorage.getItem('token');
      const body: Record<string, unknown> = {
        packageName: editing.name,
        limit: redistributeLimit
      };
      if (redistributeUseFormProposed) {
        body.proposed = {
          packageCommissionEnabled: form.packageCommissionEnabled,
          referralPoolPercentage: form.referralPoolPercentage,
          commissionRates: form.commissionRates
        };
      }
      const res = await fetch(buildApiUrl('api/admin/commissions/redistribute-package/preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error || 'Preview failed', 'error');
        return;
      }
      if ((data as { success?: boolean }).success === false) {
        showToast((data as { error?: string }).error || 'Preview failed', 'error');
        return;
      }
      const preview = data as RedistributePreviewData;
      setRedistributePreview(preview);
      const sel = new Set<string>();
      for (const row of preview?.rows || []) {
        if (!row.skipReason) sel.add(row.paymentId);
      }
      setRedistributeSelectedIds(sel);
      setRedistributeConfirm(false);
    } catch (e) {
      console.error(e);
      showToast('Preview failed', 'error');
    } finally {
      setRedistributeLoading(false);
    }
  };

  const toggleRedistributeRow = (paymentId: string) => {
    setRedistributeSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const toggleSelectAllRedistribute = () => {
    const rows = redistributePreview?.rows || [];
    const eligible = rows.filter((r) => !r.skipReason);
    if (!eligible.length) return;
    const allOn = eligible.every((r) => redistributeSelectedIds.has(r.paymentId));
    if (allOn) setRedistributeSelectedIds(new Set());
    else setRedistributeSelectedIds(new Set(eligible.map((r) => r.paymentId)));
  };

  const applyRedistribute = async () => {
    const ids = [...redistributeSelectedIds];
    if (!ids.length) {
      showToast('Select at least one payment', 'warning');
      return;
    }
    if (!redistributeConfirm) {
      showToast('Confirm the checkbox after reading the warning', 'warning');
      return;
    }
    try {
      setRedistributeApplyLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/commissions/redistribute-package/apply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ confirm: true, paymentIds: ids })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error || 'Apply failed', 'error');
        return;
      }
      showToast('Redistribution finished. Referrer balances were updated.', 'success');
      setRedistributeOpen(false);
      setRedistributePreview(null);
    } catch (e) {
      console.error(e);
      showToast('Apply failed', 'error');
    } finally {
      setRedistributeApplyLoading(false);
    }
  };

  const formatPayDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Package Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage package pricing, features, referral pool, and commission distribution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRefresh?.()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              title="Refresh"
              type="button"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2"
              type="button"
            >
              <Plus className="w-4 h-4" />
              New Package
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Price</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Active</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                  Referral Pool
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Order</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                      {!!p.subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{p.subtitle}</p>}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                    ${Number(p.price ?? 0).toFixed(2)} {p.currency || 'USD'}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {Math.round(Number(p.referralPoolPercentage ?? 0) * 100)}%
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{p.sortOrder ?? 0}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Edit"
                        type="button"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(p)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No packages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editing ? 'Edit Package' : 'Create Package'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                <input
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image (path or URL)</label>
                <input
                  value={form.image}
                  onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={form.packageCommissionEnabled}
                  onChange={(e) => setForm((p) => ({ ...p, packageCommissionEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Enable package commission distribution
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When disabled, this package purchase won’t distribute referral commissions (platform keeps 100%).
              </p>
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referral Pool Percentage (0–100)
                </label>
                <input
                  type="number"
                  value={Math.round(form.referralPoolPercentage * 100)}
                  onChange={(e) => setForm((p) => ({ ...p, referralPoolPercentage: Number(e.target.value) / 100 }))}
                disabled={!form.packageCommissionEnabled}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: 25 means 25% of package amount goes to referral pool (commissions are paid from the pool).
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Commission Rates by Level (as % of referral pool)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div key={lvl}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Level {lvl}</label>
                      <input
                        type="number"
                        value={Math.round(form.commissionRates[lvl as 1] * 100)}
                        onChange={(e) => {
                          const pct = Number(e.target.value) / 100;
                          setForm((p) => ({
                            ...p,
                            commissionRates: { ...p.commissionRates, [lvl]: pct } as CommissionRates
                          }));
                        }}
                        disabled={!form.packageCommissionEnabled}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {editing && (
                <div className="md:col-span-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                          Changed pool or level rates?
                        </p>
                        <p className="text-xs text-amber-900/90 dark:text-amber-200/80 mt-1">
                          Completed purchases keep the commission rows that were generated at payment time. Use roll
                          back and redistribute to reverse those credits and pay again using{' '}
                          <strong>saved</strong> package settings (save the package first, then apply).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openRedistributeFromEdit}
                      className="shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-800 text-white text-sm font-medium hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Roll back and redistribute…
                    </button>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Monthly fee distribution</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  This controls how completed <span className="font-mono">monthly_fee</span> payments are split between the
                  platform and referral pool, and how the pool is paid across referral levels.
                </p>
              </div>

              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Withdrawals</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Set a minimum withdrawal amount for users on this package. Leave empty to use the system default.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum withdrawal amount (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={typeof form.minWithdrawalAmount === 'number' ? form.minWithdrawalAmount : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, minWithdrawalAmount: v === '' ? null : Number(v) }));
                  }}
                  placeholder="(use default)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Fee Referral Pool Percentage (0–100)
                </label>
                <input
                  type="number"
                  value={
                    typeof form.monthlyFeeReferralPoolPercentage === 'number'
                      ? Math.round(form.monthlyFeeReferralPoolPercentage * 100)
                      : Math.round(form.referralPoolPercentage * 100)
                  }
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      monthlyFeeReferralPoolPercentage: Number(e.target.value) / 100
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If you leave this matching the package pool, monthly fees will distribute the same way as package purchases.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Fee Commission Rates by Level (as % of monthly-fee referral pool)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div key={`mf-${lvl}`}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Level {lvl}</label>
                      <input
                        type="number"
                        value={Math.round((form.monthlyFeeCommissionRates as any)[lvl] * 100)}
                        onChange={(e) => {
                          const pct = Number(e.target.value) / 100;
                          setForm((p) => ({
                            ...p,
                            monthlyFeeCommissionRates: {
                              ...(p.monthlyFeeCommissionRates as any),
                              [lvl]: pct
                            } as CommissionRates
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features (one per line)</label>
                <textarea
                  value={form.featuresText}
                  onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isSaving || !form.name.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
                type="button"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {redistributeOpen && editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Roll back and redistribute — {editing.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Matches completed payments where <span className="font-mono">package.name</span> is{' '}
                  <strong>{editing.name}</strong> (the name stored on each payment when it was made).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (redistributeLoading || redistributeApplyLoading) return;
                  setRedistributeOpen(false);
                  setRedistributePreview(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer max-w-xl">
                <input
                  type="checkbox"
                  checked={redistributeUseFormProposed}
                  onChange={(e) => setRedistributeUseFormProposed(e.target.checked)}
                  className="mt-1 rounded border-gray-300"
                  disabled={redistributeLoading || redistributeApplyLoading}
                />
                <span>
                  Preview using commission fields in this dialog (including unsaved changes). Uncheck to preview using
                  only what is already saved in the database.
                </span>
              </label>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Max payments to scan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={redistributeLimit}
                    onChange={(e) => setRedistributeLimit(Number(e.target.value) || 100)}
                    disabled={redistributeLoading || redistributeApplyLoading}
                    className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void fetchRedistributePreview()}
                  disabled={redistributeLoading || redistributeApplyLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {redistributeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Run preview
                    </>
                  )}
                </button>
              </div>

              {redistributePreview && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scanned {redistributePreview.scanned} payment(s) for package name &quot;{redistributePreview.packageName}&quot;.
                  </p>

                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[45vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left w-10">
                            <input
                              type="checkbox"
                              onChange={toggleSelectAllRedistribute}
                              checked={
                                (redistributePreview.rows.filter((r) => !r.skipReason).length > 0 &&
                                  redistributePreview.rows.filter((r) => !r.skipReason).every((r) =>
                                    redistributeSelectedIds.has(r.paymentId)
                                  )) ||
                                false
                              }
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-2 py-2 text-left">Date</th>
                          <th className="px-2 py-2 text-left">Buyer</th>
                          <th className="px-2 py-2 text-right">Net paid</th>
                          <th className="px-2 py-2 text-right">New total</th>
                          <th className="px-2 py-2 text-right">Delta</th>
                          <th className="px-2 py-2 text-left">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {redistributePreview.rows.map((row) => (
                          <tr key={row.paymentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                            <td className="px-2 py-2 align-top">
                              <input
                                type="checkbox"
                                disabled={!!row.skipReason}
                                checked={redistributeSelectedIds.has(row.paymentId)}
                                onChange={() => toggleRedistributeRow(row.paymentId)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-2 py-2 align-top whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {formatPayDate(row.createdAt)}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="text-gray-900 dark:text-white">{row.buyerName || '—'}</div>
                              <div className="text-xs text-gray-500 break-all">{row.buyerEmail}</div>
                            </td>
                            <td className="px-2 py-2 align-top text-right font-mono">${row.netPaid.toFixed(2)}</td>
                            <td className="px-2 py-2 align-top text-right font-mono">${row.newTotal.toFixed(2)}</td>
                            <td
                              className={`px-2 py-2 align-top text-right font-mono font-medium ${
                                row.deltaReferrerPayout > 0.01
                                  ? 'text-green-700 dark:text-green-400'
                                  : row.deltaReferrerPayout < -0.01
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-gray-800 dark:text-gray-200'
                              }`}
                            >
                              {row.deltaReferrerPayout > 0 ? '+' : ''}
                              {row.deltaReferrerPayout.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 align-top text-xs text-gray-600 dark:text-gray-400">
                              {row.skipReason ? (
                                <span className="text-amber-800 dark:text-amber-200">
                                  {REDISTRIBUTE_SKIP_LABELS[row.skipReason] || row.skipReason}
                                </span>
                              ) : (
                                <span>
                                  Roll back open lines (${row.oldTotalOpen.toFixed(2)}), then pay new breakdown.
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details className="text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
                      Per-payment payout detail (first eligible row)
                    </summary>
                    {(() => {
                      const sample = redistributePreview.rows.find((r) => !r.skipReason);
                      if (!sample) return <p className="mt-2">No eligible rows.</p>;
                      return (
                        <div className="mt-2 space-y-2 font-mono">
                          <p>
                            <strong>Old open commission rows:</strong>{' '}
                            {sample.oldOpenCommissions.length
                              ? sample.oldOpenCommissions
                                  .map((o) => `L${o.level} $${o.amount.toFixed(2)}`)
                                  .join('; ')
                              : 'none'}
                          </p>
                          <p>
                            <strong>New levels:</strong>{' '}
                            {sample.newLevels
                              .filter((l) => l.amount > 0)
                              .map(
                                (l) =>
                                  `L${l.level} ${l.rateOfPoolDisplay} → $${l.amount.toFixed(2)} → ${l.payTo.email}`
                              )
                              .join(' | ')}
                          </p>
                        </div>
                      );
                    })()}
                  </details>

                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redistributeConfirm}
                      onChange={(e) => setRedistributeConfirm(e.target.checked)}
                      className="mt-1 rounded border-gray-300"
                      disabled={redistributeApplyLoading}
                    />
                    <span>
                      I saved the package with the commission settings I want. Applying will post rollback rows for
                      selected payments, then create new referral commission credits from the saved package definition
                      (preview checkbox does not affect apply).
                    </span>
                  </label>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (redistributeLoading || redistributeApplyLoading) return;
                  setRedistributeOpen(false);
                  setRedistributePreview(null);
                }}
                disabled={redistributeLoading || redistributeApplyLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void applyRedistribute()}
                disabled={
                  redistributeApplyLoading ||
                  redistributeLoading ||
                  !redistributePreview ||
                  redistributeSelectedIds.size === 0 ||
                  !redistributeConfirm
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {redistributeApplyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Apply to selected ({redistributeSelectedIds.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete package?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete <span className="font-semibold">{deleteTarget.name}</span>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 flex items-center gap-2"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

