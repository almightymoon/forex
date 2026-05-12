'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Filter,
  Download,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  X,
  Plus,
  Minus,
  Loader2,
  Save,
  Edit3,
  Wrench
} from 'lucide-react';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

type CommissionRates = { 1: number; 2: number; 3: number; 4: number; 5: number };

const defaultRates: CommissionRates = { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 };

function toRates(input: Partial<CommissionRates> | undefined | null): CommissionRates {
  const r = input || {};
  return {
    1: typeof r[1] === 'number' ? r[1] : defaultRates[1],
    2: typeof r[2] === 'number' ? r[2] : defaultRates[2],
    3: typeof r[3] === 'number' ? r[3] : defaultRates[3],
    4: typeof r[4] === 'number' ? r[4] : defaultRates[4],
    5: typeof r[5] === 'number' ? r[5] : defaultRates[5]
  };
}

interface Commission {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    referralCode: string;
  };
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  notes: string;
  metadata: {
    level: string;
    packageName: string;
    packageAmount: string;
    referralPool: string;
    companyShare: string;
    buyerName: string;
    buyerEmail: string;
    commissionRate: string;
  };
  relatedPayment: {
    _id: string;
    package: {
      name: string;
      price: number;
    };
    finalAmount: number;
    status: string;
    createdAt: string;
  };
  createdAt: string;
}

interface CommissionStats {
  total: {
    totalAmount: number;
    totalCount: number;
    avgAmount: number;
  };
  byLevel: Array<{
    level: string;
    totalAmount: number;
    count: number;
  }>;
  byPackage: Array<{
    packageName: string;
    totalAmount: number;
    count: number;
  }>;
}

interface PlatformCommission {
  _id: string;
  paymentId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  package: {
    name: string;
    price: number;
  };
  packageAmount: number;
  referralPool: number;
  platformCommission: number;
  referralPoolPercentage: number;
  platformCommissionPercentage: number;
  createdAt: string;
  confirmedAt?: string;
}

interface PlatformCommissionStats {
  total: {
    totalPlatformCommission: number;
    totalReferralPool: number;
    totalPackageAmount: number;
    totalCount: number;
  };
  byPackage: Array<{
    packageName: string;
    totalAmount: number;
    platformCommission: number;
    referralPool: number;
    count: number;
  }>;
  ledger?: {
    currentBalance: number;
  };
}

interface PlatformLedgerEntry {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  notes?: string;
  createdAt: string;
  performedBy?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

interface MonthlyFeeDistributionRow {
  paymentId: string;
  createdAt: string;
  confirmedAt?: string;
  feeAmount: number;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  packageTierName: string;
  referralPoolPercentage: number;
  referralPool: number;
  platformShare: number;
  commissionTxnCount: number;
  isDistributed: boolean;
  metaDistributed: boolean;
  resolveError: string | null;
}

interface AdminPackageTier {
  _id: string;
  name: string;
  monthlyFeeEnabled?: boolean;
  monthlyFeeAmount?: number;
  referralPoolPercentage?: number;
  commissionRates?: Partial<CommissionRates>;
  monthlyFeeReferralPoolPercentage?: number | null;
  monthlyFeeCommissionRates?: Partial<CommissionRates> | null;
}

interface BackfillLevelPreview {
  level: number;
  rateOfPool: number;
  rateOfPoolDisplay: string;
  amount: number;
  payTo: { userId: string; email: string; name: string };
}

interface BackfillEligibleRow {
  paymentId: string;
  createdAt: string;
  packageNameRaw: string;
  resolvedPackageName: string;
  buyer: { email: string; name: string };
  packageAmount: number;
  referralPoolPercentage: number;
  referralPool: number;
  platformShare: number;
  levels: BackfillLevelPreview[];
  totalCommissionsToCredit: number;
  balanceTransactionsToCreate: number;
}

interface BackfillSkippedRow {
  paymentId: string;
  reason: string;
  packageNameRaw?: string;
  buyerEmail?: string;
  note?: string;
}

interface BackfillPreviewResponse {
  success?: boolean;
  scannedWithNoCommissionRows: number;
  eligible: BackfillEligibleRow[];
  skipped: BackfillSkippedRow[];
  skippedCounts: Record<string, number>;
}

const BACKFILL_SKIP_LABELS: Record<string, string> = {
  invalid_or_zero_amount: 'Package amount is zero or invalid',
  commission_disabled_or_zero_pool: 'Commission off or 0% pool for this package in database',
  buyer_not_found: 'Buyer user record missing',
  no_referrer: 'Buyer has no referrer',
  default_referral_only: 'Buyer used default referral link only',
  zero_payout_chain: 'No payable upline (broken chain or zero rates)'
};

export default function CommissionManagement() {
  const [activeView, setActiveView] = useState<'referral' | 'platform' | 'monthly_fee'>('referral');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [platformCommissions, setPlatformCommissions] = useState<PlatformCommission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformCommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    level: '',
    packageName: '',
    startDate: '',
    endDate: '',
    referrerSearch: '',
    buyerSearch: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());
  const [ledgerEntries, setLedgerEntries] = useState<PlatformLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [showPlatformLedgerModal, setShowPlatformLedgerModal] = useState(false);
  const [platformLedgerAction, setPlatformLedgerAction] = useState<'credit' | 'debit'>('credit');
  const [platformLedgerForm, setPlatformLedgerForm] = useState({ amount: '', description: '', notes: '' });
  const [platformLedgerProcessing, setPlatformLedgerProcessing] = useState(false);
  const [monthlyFeeRows, setMonthlyFeeRows] = useState<MonthlyFeeDistributionRow[]>([]);
  const [monthlyFeeDistributingId, setMonthlyFeeDistributingId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<AdminPackageTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [settingsTierId, setSettingsTierId] = useState<string>('');
  const [settingsPoolPct, setSettingsPoolPct] = useState<number>(0); // 0..1
  const [settingsRates, setSettingsRates] = useState<CommissionRates>(defaultRates);
  const [settingsMonthlyFeeEnabled, setSettingsMonthlyFeeEnabled] = useState<boolean>(true);
  const [settingsMonthlyFeeAmount, setSettingsMonthlyFeeAmount] = useState<number>(50);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showMonthlyFeeEditor, setShowMonthlyFeeEditor] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [backfillScanLimit, setBackfillScanLimit] = useState(200);
  const [backfillPreviewLoading, setBackfillPreviewLoading] = useState(false);
  const [backfillApplyLoading, setBackfillApplyLoading] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState<BackfillPreviewResponse | null>(null);
  const [backfillSelectedIds, setBackfillSelectedIds] = useState<Set<string>>(new Set());
  const [backfillConfirmChecked, setBackfillConfirmChecked] = useState(false);
  const [backfillExpandedPaymentId, setBackfillExpandedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === 'referral') {
      fetchCommissions();
    } else if (activeView === 'platform') {
      fetchPlatformCommissions();
    } else {
      fetchMonthlyFeeDistributions();
    }
  }, [pagination.page, filters, activeView]);

  useEffect(() => {
    if (activeView !== 'monthly_fee') return;
    fetchMonthlyFeeTiers();
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'monthly_fee') return;
    if (!settingsTierId) return;
    const t = tiers.find((x) => x._id === settingsTierId);
    if (!t) return;
    const pool =
      typeof t.monthlyFeeReferralPoolPercentage === 'number'
        ? t.monthlyFeeReferralPoolPercentage
        : typeof t.referralPoolPercentage === 'number'
          ? t.referralPoolPercentage
          : 0;
    const rates = toRates((t.monthlyFeeCommissionRates as any) ?? (t.commissionRates as any));
    setSettingsPoolPct(pool);
    setSettingsRates(rates);
    setSettingsMonthlyFeeEnabled(t.monthlyFeeEnabled !== false);
    setSettingsMonthlyFeeAmount(
      typeof t.monthlyFeeAmount === 'number' && Number.isFinite(t.monthlyFeeAmount) ? t.monthlyFeeAmount : 50
    );
  }, [activeView, settingsTierId, tiers]);

  useEffect(() => {
    if (activeView !== 'platform') return;
    fetchPlatformLedger();
  }, [activeView, ledgerPagination.page]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.level && { level: filters.level }),
        ...(filters.packageName && { packageName: filters.packageName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.referrerSearch && { referrerId: filters.referrerSearch }),
        ...(filters.buyerSearch && { buyerId: filters.buyerSearch })
      });

      const res = await fetch(buildApiUrl(`api/admin/commissions?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch commissions');
      }

      const data = await res.json();
      setCommissions(data.commissions || []);
      setStats(data.stats || null);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformCommissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.packageName && { packageName: filters.packageName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      // Build the API URL - ensure we have the correct base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      // Remove trailing /api if present since we're adding it
      const cleanBaseUrl = baseUrl.replace(/\/api$/, '');
      const apiUrl = `${cleanBaseUrl}/api/admin/platform-commissions?${params}`;
      console.log('[Platform Commissions] Fetching from:', apiUrl);
      
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch platform commissions');
      }

      const data = await res.json();
      console.log('[Platform Commissions] Response:', data);
      console.log('[Platform Commissions] Commissions count:', data.commissions?.length || 0);
      setPlatformCommissions(data.commissions || []);
      const stats = data.stats || null;
      setPlatformStats(
        stats
          ? {
              ...stats,
              ledger: stats.ledger ?? { currentBalance: 0 }
            }
          : null
      );
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('[Platform Commissions] Error fetching platform commissions:', error);
      console.error('[Platform Commissions] Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBackfillModal = () => {
    setBackfillOpen(true);
    setBackfillPreview(null);
    setBackfillSelectedIds(new Set());
    setBackfillConfirmChecked(false);
    setBackfillExpandedPaymentId(null);
  };

  const fetchBackfillPreview = async () => {
    try {
      setBackfillPreviewLoading(true);
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({
        limit: String(Math.min(Math.max(backfillScanLimit, 1), 500))
      });
      const res = await fetch(buildApiUrl(`api/admin/commissions/backfill-missing-package/preview?${qs}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Preview failed');
      }
      const preview = data as BackfillPreviewResponse;
      setBackfillPreview(preview);
      const eligible = preview.eligible || [];
      setBackfillSelectedIds(new Set(eligible.map((r) => r.paymentId)));
      setBackfillConfirmChecked(false);
      setBackfillExpandedPaymentId(null);
    } catch (e) {
      console.error('Backfill preview error:', e);
      showToast(e instanceof Error ? e.message : 'Preview failed', 'error');
    } finally {
      setBackfillPreviewLoading(false);
    }
  };

  const toggleBackfillPaymentSelected = (paymentId: string) => {
    setBackfillSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const toggleSelectAllBackfillEligible = () => {
    const eligible = backfillPreview?.eligible || [];
    if (!eligible.length) return;
    const allSelected = eligible.every((r) => backfillSelectedIds.has(r.paymentId));
    if (allSelected) {
      setBackfillSelectedIds(new Set());
    } else {
      setBackfillSelectedIds(new Set(eligible.map((r) => r.paymentId)));
    }
  };

  const applyBackfillMissingCommissions = async () => {
    const ids = [...backfillSelectedIds];
    if (!ids.length) {
      showToast('Select at least one payment', 'warning');
      return;
    }
    if (!backfillConfirmChecked) {
      showToast('Confirm that you have reviewed the payout breakdown', 'warning');
      return;
    }
    try {
      setBackfillApplyLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/commissions/backfill-missing-package/apply'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: true, paymentIds: ids })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Apply failed');
      }
      const results = (data.results || []) as Array<{
        paymentId: string;
        ok: boolean;
        commissionsCreated?: number;
        detail?: string;
        error?: string;
      }>;
      const created = results.filter((r) => r.ok && (r.commissionsCreated || 0) > 0).length;
      const noop = results.filter((r) => r.ok && (r.commissionsCreated || 0) === 0).length;
      const failed = results.filter((r) => !r.ok).length;
      showToast(
        `Backfill finished: ${created} paid, ${noop} no-op, ${failed} errors. Refresh lists to verify.`,
        created ? 'success' : 'info'
      );
      setBackfillOpen(false);
      setBackfillPreview(null);
      await fetchPlatformCommissions();
    } catch (e) {
      console.error('Backfill apply error:', e);
      showToast(e instanceof Error ? e.message : 'Apply failed', 'error');
    } finally {
      setBackfillApplyLoading(false);
    }
  };

  const fetchMonthlyFeeDistributions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      const res = await fetch(buildApiUrl(`api/admin/monthly-fee-distributions?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch monthly fee distributions');
      }
      const data = await res.json();
      setMonthlyFeeRows(data.rows || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('[Monthly fee distributions] fetch error:', error);
      showToast('Could not load monthly fee distributions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyFeeTiers = async () => {
    try {
      setTiersLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/packages'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => []);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error('Failed to fetch packages');
      }
      setTiers(data as AdminPackageTier[]);
      if (!settingsTierId && data.length > 0) {
        setSettingsTierId(String((data[0] as AdminPackageTier)._id));
      }
    } catch (e) {
      console.error(e);
      showToast('Could not load package tiers', 'error');
    } finally {
      setTiersLoading(false);
    }
  };

  const saveMonthlyFeeSettings = async () => {
    if (!settingsTierId) return;
    const tier = tiers.find((t) => t._id === settingsTierId);
    if (!tier) return;
    try {
      setSettingsSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/packages/${tier._id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthlyFeeEnabled: !!settingsMonthlyFeeEnabled,
          monthlyFeeAmount: settingsMonthlyFeeEnabled ? Number(settingsMonthlyFeeAmount) : 0,
          monthlyFeeReferralPoolPercentage: Number(settingsPoolPct),
          monthlyFeeCommissionRates: settingsRates
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as any)?.error || 'Failed to save monthly fee distribution settings', 'error');
        return;
      }
      showToast('Monthly fee distribution settings saved', 'success');
      await fetchMonthlyFeeTiers();
      await fetchMonthlyFeeDistributions();
    } catch (e) {
      console.error(e);
      showToast('Failed to save monthly fee distribution settings', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleMonthlyFeeDistribute = async (paymentId: string) => {
    if (
      !window.confirm(
        'Run distribution for this monthly fee? Referrers will be credited from the referral pool (same rules as package purchases).'
      )
    ) {
      return;
    }
    setMonthlyFeeDistributingId(paymentId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        buildApiUrl(`api/admin/monthly-fee-distributions/${paymentId}/distribute`),
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error || 'Distribution failed', 'error');
        return;
      }
      showToast((data as { message?: string }).message || 'Distribution complete', 'success');
      await fetchMonthlyFeeDistributions();
    } catch (e) {
      console.error(e);
      showToast('Distribution request failed', 'error');
    } finally {
      setMonthlyFeeDistributingId(null);
    }
  };

  const fetchPlatformLedger = async () => {
    try {
      setLedgerLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: ledgerPagination.page.toString(),
        limit: ledgerPagination.limit.toString()
      });
      const res = await fetch(buildApiUrl(`api/admin/platform-commission-ledger?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch platform commission ledger');
      }
      const data = await res.json();
      setLedgerEntries(data.entries || []);
      setLedgerPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? 0,
        pages: data.pagination?.pages ?? 1
      }));
      if (typeof data.currentBalance === 'number') {
        setPlatformStats((prev) =>
          prev ? { ...prev, ledger: { currentBalance: data.currentBalance } } : prev
        );
      }
    } catch (error) {
      console.error('[Platform Commission Ledger] fetch error:', error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const openPlatformLedgerModal = (action: 'credit' | 'debit') => {
    setPlatformLedgerAction(action);
    setPlatformLedgerForm({ amount: '', description: '', notes: '' });
    setShowPlatformLedgerModal(true);
  };

  const handlePlatformLedgerSubmit = async () => {
    if (!platformLedgerForm.amount || !platformLedgerForm.description.trim()) {
      showToast('Please enter amount and description', 'error');
      return;
    }
    setPlatformLedgerProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        buildApiUrl(`api/admin/platform-commission/${platformLedgerAction}`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(platformLedgerForm)
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data as { error?: string }).error ||
          (Array.isArray((data as { errors?: { msg?: string }[] }).errors)
            ? (data as { errors: { msg?: string }[] }).errors[0]?.msg
            : null) ||
          `Failed to ${platformLedgerAction} platform commission`;
        showToast(msg, 'error');
        return;
      }
      showToast(
        platformLedgerAction === 'credit'
          ? 'Platform commission credited successfully'
          : 'Platform commission debited successfully',
        'success'
      );
      setShowPlatformLedgerModal(false);
      setPlatformLedgerForm({ amount: '', description: '', notes: '' });
      await fetchPlatformCommissions();
      await fetchPlatformLedger();
    } catch (e) {
      console.error(e);
      showToast('Error updating platform commission ledger', 'error');
    } finally {
      setPlatformLedgerProcessing(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      packageName: '',
      startDate: '',
      endDate: '',
      referrerSearch: '',
      buyerSearch: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportCommissions = () => {
    const csv = [
      ['Date', 'Referrer', 'Level', 'Package', 'Package Amount', 'Referral Pool', 'Commission Rate', 'Commission Amount', 'Buyer', 'Buyer Email'].join(','),
      ...commissions.map(c => [
        new Date(c.createdAt).toLocaleDateString(),
        `${c.user.firstName} ${c.user.lastName}`,
        `Level ${c.metadata.level}`,
        c.metadata.packageName,
        `$${c.metadata.packageAmount}`,
        `$${c.metadata.referralPool}`,
        `${(parseFloat(String(c.metadata.commissionRate)) || 0).toFixed(2)}%`,
        `$${c.amount.toFixed(2)}`,
        c.metadata.buyerName,
        c.metadata.buyerEmail
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      '2': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      '3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      '4': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '5': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  // Group commissions by buyer
  const groupedCommissions = commissions.reduce((acc, commission) => {
    const buyerKey = commission.metadata.buyerEmail || 'unknown';
    if (!acc[buyerKey]) {
      acc[buyerKey] = {
        buyerName: commission.metadata.buyerName,
        buyerEmail: commission.metadata.buyerEmail,
        commissions: [],
        totalAmount: 0,
        count: 0
      };
    }
    acc[buyerKey].commissions.push(commission);
    acc[buyerKey].totalAmount += commission.amount;
    acc[buyerKey].count += 1;
    return acc;
  }, {} as Record<string, {
    buyerName: string;
    buyerEmail: string;
    commissions: Commission[];
    totalAmount: number;
    count: number;
  }>);

  const toggleBuyer = (buyerEmail: string) => {
    setExpandedBuyers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buyerEmail)) {
        newSet.delete(buyerEmail);
      } else {
        newSet.add(buyerEmail);
      }
      return newSet;
    });
  };

  if (
    loading &&
    (activeView === 'referral'
      ? commissions.length === 0
      : activeView === 'platform'
        ? platformCommissions.length === 0
        : monthlyFeeRows.length === 0)
  ) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Commission Distributions</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {activeView === 'referral' && 'View and manage all referral commission distributions'}
            {activeView === 'platform' && 'Calculated platform share from package sales and manual platform ledger'}
            {activeView === 'monthly_fee' &&
              'Split completed monthly fees between the referral pool and platform using each student’s package tier'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (activeView === 'referral') {
                fetchCommissions();
              } else if (activeView === 'platform') {
                fetchPlatformCommissions();
                fetchPlatformLedger();
              } else {
                fetchMonthlyFeeDistributions();
              }
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCommissions}
            disabled={activeView !== 'referral'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => {
            setActiveView('referral');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-5 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
            activeView === 'referral'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          Referral Commissions
        </button>
        <button
          onClick={() => {
            setActiveView('platform');
            setPagination(prev => ({ ...prev, page: 1 }));
            setLedgerPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`px-5 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
            activeView === 'platform'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 shrink-0" />
          Platform Commissions
        </button>
        <button
          onClick={() => {
            setActiveView('monthly_fee');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-5 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
            activeView === 'monthly_fee'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          Monthly fee distribution
        </button>
      </div>

      {/* Statistics Cards - Referral Commissions */}
      {activeView === 'referral' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Commissions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.total.totalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.total.totalCount} transactions
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Commission</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${stats.total.avgAmount.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">By Package</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byPackage.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  packages
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">By Level</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.byLevel.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  levels active
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards - Platform Commissions */}
      {activeView === 'platform' && platformStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Platform Commission</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalPlatformCommission.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {platformStats.total.totalCount} payments
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Referral Pool</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalReferralPool.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Distributed to referrers
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${platformStats.total.totalPackageAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  All package sales
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Platform Share %</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {platformStats.total.totalPackageAmount > 0 
                    ? ((platformStats.total.totalPlatformCommission / platformStats.total.totalPackageAmount) * 100).toFixed(1)
                    : '0'
                  }%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Average platform share
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {activeView === 'platform' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-3 items-start">
            <Wrench className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-950 dark:text-amber-100">Missed package referral commissions</p>
              <p className="text-sm text-amber-900/90 dark:text-amber-200/90 mt-1 max-w-3xl">
                Preview completed package payments that still have zero referral commission transactions but should pay
                under the current package settings. You will see each payout line before applying. New packages use the
                exact name stored in Packages — no extra allowlist is required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openBackfillModal}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 font-medium text-sm"
          >
            <Wrench className="w-4 h-4" />
            Review & backfill
          </button>
        </div>
      )}

      {activeView === 'platform' && platformStats && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Platform commission ledger (manual)
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                ${(platformStats.ledger?.currentBalance ?? 0).toFixed(2)}{' '}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400">USDT</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
                Credit or debit this balance like a user wallet. Totals above remain the calculated company share
                from completed package payments; this ledger is for adjustments, payouts, and reconciliation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openPlatformLedgerModal('credit')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Credit
              </button>
              <button
                type="button"
                onClick={() => openPlatformLedgerModal('debit')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                <Minus className="w-4 h-4" />
                Debit
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ledger history</h3>
              {ledgerLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Balance after
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Admin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ledgerEntries.length === 0 && !ledgerLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No ledger entries yet. Use Credit or Debit to record adjustments.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.type === 'credit'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {row.type === 'credit' ? '+' : '-'}${row.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          ${row.balanceAfter.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={row.description}>
                          {row.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {row.performedBy
                            ? `${row.performedBy.firstName || ''} ${row.performedBy.lastName || ''}`.trim() ||
                              row.performedBy.email
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {ledgerPagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {ledgerPagination.page} of {ledgerPagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={ledgerPagination.page <= 1}
                    onClick={() =>
                      setLedgerPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                    }
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={ledgerPagination.page >= ledgerPagination.pages}
                    onClick={() =>
                      setLedgerPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'monthly_fee' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-semibold mb-2">How monthly fee distribution works</p>
          <ul className="list-disc list-inside space-y-1 opacity-95">
            <li>Lists completed monthly fee payments only.</li>
            <li>
              Referral pool percentage and per-level rates come from the student&apos;s current package tier&apos;s
              <strong> monthly fee distribution</strong> settings.
            </li>
            <li>
              Run <strong>Distribute</strong> once per payment. If there is no referrer, default-referral-only signup,
              or a zero pool, the row is marked done with no payouts.
            </li>
          </ul>
        </div>
      )}

      {activeView === 'monthly_fee' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly fee distribution settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Set how much of a monthly fee goes to <strong>referrals</strong> vs <strong>platform</strong>, and the level splits.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMonthlyFeeEditor(false)}
                disabled={!showMonthlyFeeEditor || settingsSaving}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
              >
                Close editor
              </button>
              <button
                type="button"
                onClick={saveMonthlyFeeSettings}
                disabled={settingsSaving || tiersLoading || !settingsTierId || !showMonthlyFeeEditor}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>

          {/* Saved settings list */}
          <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Saved package settings</p>
              {tiersLoading ? (
                <span className="text-xs text-gray-500 inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </span>
              ) : (
                <span className="text-xs text-gray-500">{tiers.length} package(s)</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white dark:bg-gray-800">
                  <tr className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left">Package</th>
                    <th className="px-4 py-3 text-left">Monthly fee</th>
                    <th className="px-4 py-3 text-left">Pool %</th>
                    <th className="px-4 py-3 text-left">Level rates (1–5)</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tiers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No packages found.
                      </td>
                    </tr>
                  ) : (
                    tiers.map((t) => {
                      const enabled = t.monthlyFeeEnabled !== false;
                      const feeAmt = enabled ? Number(t.monthlyFeeAmount ?? 0) || 0 : 0;
                      const pool =
                        typeof t.monthlyFeeReferralPoolPercentage === 'number'
                          ? t.monthlyFeeReferralPoolPercentage
                          : typeof t.referralPoolPercentage === 'number'
                            ? t.referralPoolPercentage
                            : 0;
                      const rates = toRates((t.monthlyFeeCommissionRates as any) ?? (t.commissionRates as any));
                      const rateStr = [1, 2, 3, 4, 5]
                        .map((lvl) => `${Math.round((rates as any)[lvl] * 100)}%`)
                        .join(' / ');
                      return (
                        <tr key={t._id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                            {t.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {enabled ? (
                              <span className="text-gray-900 dark:text-white">
                                ${feeAmt.toFixed(2)}
                                <span className="text-xs text-gray-500 dark:text-gray-400"> / mo</span>
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                Disabled
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(pool * 100).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                            {rateStr}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSettingsTierId(String(t._id));
                                setShowMonthlyFeeEditor(true);
                                // scroll editor into view (best-effort)
                                setTimeout(() => {
                                  const el = document.getElementById('monthly-fee-settings-editor');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 0);
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Editor (shown only after clicking Edit) */}
          {showMonthlyFeeEditor && (
            <div id="monthly-fee-settings-editor" className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package tier</label>
                <select
                  value={settingsTierId}
                  onChange={(e) => setSettingsTierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={tiersLoading}
                >
                  {tiers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {tiersLoading && <p className="text-xs text-gray-500 mt-1">Loading tiers…</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monthly fee amount (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number.isFinite(settingsMonthlyFeeAmount) ? settingsMonthlyFeeAmount : 0}
                  onChange={(e) => setSettingsMonthlyFeeAmount(Number(e.target.value))}
                  disabled={!settingsMonthlyFeeEnabled}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <label className="mt-2 flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settingsMonthlyFeeEnabled}
                    onChange={(e) => setSettingsMonthlyFeeEnabled(e.target.checked)}
                    className="mt-1 rounded"
                  />
                  <span>
                    <strong>Monthly fee enabled</strong> (disable to not impose monthly fees for this package)
                  </span>
                </label>
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 p-3">
                {(() => {
                  const exampleFee = settingsMonthlyFeeEnabled
                    ? Number.isFinite(settingsMonthlyFeeAmount)
                      ? Number(settingsMonthlyFeeAmount) || 0
                      : 0
                    : 0;
                  const poolAmt = Math.round(exampleFee * settingsPoolPct * 100) / 100;
                  const platAmt = Math.round(exampleFee * (1 - settingsPoolPct) * 100) / 100;
                  return (
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      <p className="font-medium">Example (using tier monthly fee)</p>
                      <p className="mt-1">
                        Fee: <strong>${exampleFee.toFixed(2)}</strong> → Referrals: <strong>${poolAmt.toFixed(2)}</strong>, Platform:{' '}
                        <strong>${platAmt.toFixed(2)}</strong>
                      </p>
                    </div>
                  );
                })()}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referral pool % (of monthly fee)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(settingsPoolPct * 100)}
                  onChange={(e) => setSettingsPoolPct(Number(e.target.value) / 100)}
                  disabled={!settingsMonthlyFeeEnabled}
                  className="w-full md:max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Platform share will be <strong>{Math.max(0, 100 - Math.round(settingsPoolPct * 100))}%</strong>.
                </p>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referral level rates (as % of referral pool)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div key={`lvl-${lvl}`}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Level {lvl}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(settingsRates[lvl as 1] * 100)}
                        onChange={(e) => {
                          const pct = Number(e.target.value) / 100;
                          setSettingsRates((p) => ({ ...p, [lvl]: pct } as CommissionRates));
                        }}
                        disabled={!settingsMonthlyFeeEnabled}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Filters</span>
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeView === 'referral' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Level
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Levels</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
              </div>
            )}

            {activeView !== 'monthly_fee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Package
                </label>
                <select
                  value={filters.packageName}
                  onChange={(e) => handleFilterChange('packageName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Packages</option>
                  <option value="FX Launch">FX Launch</option>
                  <option value="FX Scale">FX Scale</option>
                  <option value="FX Legacy">FX Legacy</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {activeView === 'referral' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Referrer
                  </label>
                  <input
                    type="text"
                    value={filters.referrerSearch}
                    onChange={(e) => handleFilterChange('referrerSearch', e.target.value)}
                    placeholder="Email or name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Buyer
                  </label>
                  <input
                    type="text"
                    value={filters.buyerSearch}
                    onChange={(e) => handleFilterChange('buyerSearch', e.target.value)}
                    placeholder="Email or name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly fee distribution table */}
      {activeView === 'monthly_fee' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tier (pool rules)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Referral pool
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Platform share
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {monthlyFeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No completed monthly fee payments found.
                    </td>
                  </tr>
                ) : (
                  monthlyFeeRows.map((row) => (
                    <tr key={row.paymentId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {row.user
                              ? `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim() || '—'
                              : '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        ${row.feeAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {row.packageTierName}
                        <span className="block text-xs text-gray-500">
                          Pool {row.referralPoolPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                        ${row.referralPool.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                        ${row.platformShare.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.isDistributed ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                            Done
                            {row.commissionTxnCount > 0 ? ` (${row.commissionTxnCount} txns)` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100">
                            Pending
                          </span>
                        )}
                        {row.resolveError && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-[200px]">{row.resolveError}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={
                            row.isDistributed ||
                            !!row.resolveError ||
                            monthlyFeeDistributingId === row.paymentId
                          }
                          onClick={() => handleMonthlyFeeDistribute(row.paymentId)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          {monthlyFeeDistributingId === row.paymentId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              …
                            </>
                          ) : (
                            'Distribute'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referral Commissions Table */}
      {activeView === 'referral' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referrer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Referral Pool</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Buyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No commissions found
                  </td>
                </tr>
              ) : (
                Object.entries(groupedCommissions).map(([buyerEmail, group]) => {
                  const isExpanded = expandedBuyers.has(buyerEmail);
                  return (
                    <React.Fragment key={buyerEmail}>
                      {/* Buyer Header Row */}
                      <tr 
                        className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-l-4 border-blue-500"
                        onClick={() => toggleBuyer(buyerEmail)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(group.commissions[0]?.createdAt || '')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={2}>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {group.buyerName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {group.buyerEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-xs font-medium">
                            {group.count} {group.count === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" colSpan={3}>
                          <span className="text-xs text-gray-500 dark:text-gray-500 italic">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'} details
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${group.totalAmount.toFixed(2)}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={2}></td>
                      </tr>
                      {/* Commission Detail Rows */}
                      {isExpanded && group.commissions.map((commission) => (
                        <tr key={commission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-gray-800">
                          <td className="px-4 py-3 pl-8 text-sm text-gray-900 dark:text-white">
                            {formatDate(commission.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {commission.user.firstName} {commission.user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {commission.user.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(commission.metadata.level)}`}>
                              Level {commission.metadata.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {commission.metadata.packageName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ${parseFloat(commission.metadata.packageAmount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ${parseFloat(commission.metadata.referralPool).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {(parseFloat(String(commission.metadata.commissionRate)) || 0).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${commission.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {commission.metadata.buyerName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {commission.metadata.buyerEmail}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCommission(commission);
                              }}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} commissions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Platform Commissions Table */}
      {activeView === 'platform' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referral Pool
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform Commission
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform Share %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {platformCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No platform commissions found
                    </td>
                  </tr>
                ) : (
                  platformCommissions.map((commission) => (
                    <tr key={commission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatDate(commission.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {commission.user?.firstName} {commission.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {commission.user?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {commission.package?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        ${commission.packageAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${commission.referralPool.toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({commission.referralPoolPercentage.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          ${commission.platformCommission.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {commission.platformCommissionPercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payments
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform Commission Breakdown by Package */}
      {activeView === 'platform' && platformStats && platformStats.byPackage.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Commission by Package
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platformStats.byPackage.map((pkg) => (
              <div key={pkg.packageName} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{pkg.packageName}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${pkg.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Platform Commission:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">${pkg.platformCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Referral Pool:</span>
                    <span className="text-gray-900 dark:text-white">${pkg.referralPool.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-600 dark:text-gray-400">Platform Share:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {pkg.totalAmount > 0 ? ((pkg.platformCommission / pkg.totalAmount) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {pkg.count} payment(s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission Detail Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Commission Details
                </h3>
                <button
                  onClick={() => setSelectedCommission(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedCommission.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Commission Amount</p>
                    <p className="font-semibold text-green-600 dark:text-green-400 text-lg">
                      ${selectedCommission.amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Referrer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.firstName} {selectedCommission.user.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Referral Code</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.user.referralCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Balance After</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${selectedCommission.balanceAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Package & Commission Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Package</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.packageName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(selectedCommission.metadata.level)}`}>
                        Level {selectedCommission.metadata.level}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Package Amount</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.packageAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Referral Pool</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.referralPool).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Company Share</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${parseFloat(selectedCommission.metadata.companyShare).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Commission Rate</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {(parseFloat(String(selectedCommission.metadata.commissionRate)) || 0).toFixed(2)}% of pool
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Buyer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.buyerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedCommission.metadata.buyerEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCommission.notes && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Notes</p>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedCommission.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {backfillOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backfill package referral commissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Step 1: scan recent completed package payments with no commission rows. Step 2: review payouts. Step 3:
                  apply selected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (backfillApplyLoading || backfillPreviewLoading) return;
                  setBackfillOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={backfillApplyLoading || backfillPreviewLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Scan last N completed package payments (no commission rows yet)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={backfillScanLimit}
                    onChange={(e) => setBackfillScanLimit(Number(e.target.value) || 200)}
                    disabled={backfillPreviewLoading || backfillApplyLoading}
                    className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void fetchBackfillPreview()}
                  disabled={backfillPreviewLoading || backfillApplyLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {backfillPreviewLoading ? (
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

              {backfillPreview && (
                <>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      Candidates scanned: {backfillPreview.scannedWithNoCommissionRows}
                    </span>
                    <span className="inline-flex px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100">
                      Eligible to pay: {backfillPreview.eligible.length}
                    </span>
                    <span className="inline-flex px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      Skipped: {backfillPreview.skipped.length}
                    </span>
                  </div>

                  {Object.keys(backfillPreview.skippedCounts || {}).length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="font-medium text-gray-700 dark:text-gray-300">Skipped reasons (counts)</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {Object.entries(backfillPreview.skippedCounts).map(([code, count]) => (
                          <li key={code}>
                            {BACKFILL_SKIP_LABELS[code] || code}: <strong>{count}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {backfillPreview.eligible.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/80 text-sm font-medium text-gray-900 dark:text-white">
                        Payout preview (creates referral commission balance transactions)
                      </div>
                      <div className="overflow-x-auto max-h-[42vh] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                            <tr>
                              <th className="px-2 py-2 text-left w-10">
                                <input
                                  type="checkbox"
                                  checked={
                                    backfillPreview.eligible.length > 0 &&
                                    backfillPreview.eligible.every((r) => backfillSelectedIds.has(r.paymentId))
                                  }
                                  onChange={toggleSelectAllBackfillEligible}
                                  className="rounded border-gray-300"
                                />
                              </th>
                              <th className="px-2 py-2 text-left">Date</th>
                              <th className="px-2 py-2 text-left">Buyer</th>
                              <th className="px-2 py-2 text-left">Package</th>
                              <th className="px-2 py-2 text-right">Sale</th>
                              <th className="px-2 py-2 text-right">Pool</th>
                              <th className="px-2 py-2 text-right">Pay referrers</th>
                              <th className="px-2 py-2 text-left w-24">Levels</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {backfillPreview.eligible.map((row) => (
                              <React.Fragment key={row.paymentId}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                  <td className="px-2 py-2 align-top">
                                    <input
                                      type="checkbox"
                                      checked={backfillSelectedIds.has(row.paymentId)}
                                      onChange={() => toggleBackfillPaymentSelected(row.paymentId)}
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-2 py-2 align-top whitespace-nowrap text-gray-700 dark:text-gray-300">
                                    {formatDate(row.createdAt)}
                                  </td>
                                  <td className="px-2 py-2 align-top">
                                    <div className="text-gray-900 dark:text-white font-medium">{row.buyer.name || '—'}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{row.buyer.email}</div>
                                  </td>
                                  <td className="px-2 py-2 align-top">
                                    <div className="text-gray-900 dark:text-white">{row.packageNameRaw}</div>
                                    <div className="text-xs text-gray-500">Tier: {row.resolvedPackageName}</div>
                                  </td>
                                  <td className="px-2 py-2 align-top text-right font-mono">${row.packageAmount.toFixed(2)}</td>
                                  <td className="px-2 py-2 align-top text-right font-mono">
                                    ${row.referralPool.toFixed(2)}
                                    <div className="text-xs text-gray-500 font-sans">
                                      {(row.referralPoolPercentage * 100).toFixed(0)}% pool
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 align-top text-right font-mono text-green-700 dark:text-green-400 font-medium">
                                    ${row.totalCommissionsToCredit.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-2 align-top">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBackfillExpandedPaymentId((id) =>
                                          id === row.paymentId ? null : row.paymentId
                                        )
                                      }
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      {backfillExpandedPaymentId === row.paymentId ? 'Hide' : 'Show'} breakdown
                                    </button>
                                  </td>
                                </tr>
                                {backfillExpandedPaymentId === row.paymentId && (
                                  <tr className="bg-gray-50/80 dark:bg-gray-900/50">
                                    <td colSpan={8} className="px-4 py-3 text-xs">
                                      <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                                        Per-level credits (of ${row.referralPool.toFixed(2)} pool)
                                      </p>
                                      <ul className="space-y-1 font-mono text-gray-700 dark:text-gray-300">
                                        {row.levels.map((lv) => (
                                          <li key={lv.level}>
                                            L{lv.level} — {lv.rateOfPoolDisplay} of pool → ${lv.amount.toFixed(2)} →{' '}
                                            {lv.payTo.name || lv.payTo.email} ({lv.payTo.email})
                                          </li>
                                        ))}
                                      </ul>
                                      <p className="mt-2 text-gray-600 dark:text-gray-400 font-sans">
                                        Platform share after pool: ${row.platformShare.toFixed(2)} (unchanged; this
                                        only creates missing referrer credits).
                                      </p>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {backfillPreview.skipped.length > 0 && (
                    <details className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
                        Skipped rows (sample, {backfillPreview.skipped.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                        {backfillPreview.skipped.slice(0, 40).map((s) => (
                          <li key={s.paymentId}>
                            <span className="font-mono">{s.paymentId}</span> —{' '}
                            {BACKFILL_SKIP_LABELS[s.reason] || s.reason}
                            {s.buyerEmail ? ` — ${s.buyerEmail}` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={backfillConfirmChecked}
                      onChange={(e) => setBackfillConfirmChecked(e.target.checked)}
                      className="mt-1 rounded border-gray-300"
                      disabled={backfillApplyLoading}
                    />
                    <span>
                      {
                        "I have reviewed the payout breakdown above. Apply will credit selected referrers' balances and create referral commission transactions (same as normal checkout processing)."
                      }
                    </span>
                  </label>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (backfillApplyLoading || backfillPreviewLoading) return;
                  setBackfillOpen(false);
                }}
                disabled={backfillApplyLoading || backfillPreviewLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void applyBackfillMissingCommissions()}
                disabled={
                  backfillApplyLoading ||
                  backfillPreviewLoading ||
                  !backfillPreview ||
                  backfillPreview.eligible.length === 0 ||
                  backfillSelectedIds.size === 0 ||
                  !backfillConfirmChecked
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {backfillApplyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Apply selected ({backfillSelectedIds.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlatformLedgerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                {platformLedgerAction} platform commission
              </h3>
              <button
                type="button"
                onClick={() => !platformLedgerProcessing && setShowPlatformLedgerModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={platformLedgerProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Current ledger balance:</strong> $
                  {(platformStats?.ledger?.currentBalance ?? 0).toFixed(2)} USDT
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (USDT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={platformLedgerForm.amount}
                  onChange={(e) =>
                    setPlatformLedgerForm({ ...platformLedgerForm, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  disabled={platformLedgerProcessing}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={platformLedgerForm.description}
                  onChange={(e) =>
                    setPlatformLedgerForm({ ...platformLedgerForm, description: e.target.value })
                  }
                  placeholder="Reason for this transaction"
                  disabled={platformLedgerProcessing}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={platformLedgerForm.notes}
                  onChange={(e) =>
                    setPlatformLedgerForm({ ...platformLedgerForm, notes: e.target.value })
                  }
                  rows={3}
                  disabled={platformLedgerProcessing}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlatformLedgerModal(false)}
                  disabled={platformLedgerProcessing}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePlatformLedgerSubmit}
                  disabled={platformLedgerProcessing}
                  className={`flex-1 px-4 py-2 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                    platformLedgerAction === 'credit'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {platformLedgerProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      {platformLedgerAction === 'credit' ? (
                        <Plus className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      {platformLedgerAction === 'credit' ? 'Credit' : 'Debit'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
