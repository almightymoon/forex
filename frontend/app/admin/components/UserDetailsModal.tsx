'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User as UserIcon, Mail, Phone, MapPin, Calendar, 
  DollarSign, CreditCard, Users, Package, TrendingUp, 
  Wallet, ArrowUpRight, CheckCircle, Clock, AlertCircle,
  Shield, Activity, Loader2, Plus, Minus, Gift, History, Pencil,
  MailX, Sparkles, Target, CalendarClock, Receipt, RefreshCw
} from 'lucide-react';
import EmailHistory from './EmailHistory';
import MonthlyFeeHistoryPanel from './MonthlyFeeHistoryPanel';
import ImposeMonthlyFeeDateFields from './ImposeMonthlyFeeDateFields';
import { defaultFeePeriod, feeMonthString } from './imposeMonthlyFeeDateUtils';
import { User } from './types';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

interface UserDetails {
  payments: any[];
  withdrawals: any[];
  referrals: any[];
  transactions: any[];
  referralTree: {
    tree: any[];
    stats: {
      totalReferrals: number;
      totalDescendants: number;
      activeReferrals: number;
      verifiedReferrals: number;
      directReferrals?: number;
      directVerifiedReferrals?: number;
      rank?: {
        current?: { name?: string; description?: string };
        next?: { name?: string; minDirects?: number; minReferrals?: number };
        progressToNext?: number;
      };
    };
    rootUser: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      referralCode: string;
      parentReferralCode?: string | null;
    };
    referredBy?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      referralCode?: string;
      isActive?: boolean;
      isVerified?: boolean;
      createdAt?: string;
    } | null;
  } | null;
  package: {
    name: string;
    price: number;
    expiresAt?: string;
  } | null;
  totalEarnings: number;
  pendingCommissions: number;
  completedReferrals: number;
}

export default function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'monthly_fee' | 'withdrawals' | 'referrals' | 'transactions' | 'email'
  >('overview');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAction, setBalanceAction] = useState<'credit' | 'debit' | 'bonus'>('credit');
  const [balanceForm, setBalanceForm] = useState({ amount: '', description: '', notes: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnreachableModal, setShowUnreachableModal] = useState(false);
  const [unreachableReason, setUnreachableReason] = useState('');
  const [isUpdatingUnreachable, setIsUpdatingUnreachable] = useState(false);
  const [monthlyFeeStatus, setMonthlyFeeStatus] = useState<Record<string, unknown> | null>(null);
  const [showImposeMonthlyFeeModal, setShowImposeMonthlyFeeModal] = useState(false);
  const [imposeMonthlyForm, setImposeMonthlyForm] = useState({
    amount: '',
    notes: '',
    blockAccess: true,
    forceWithoutMonthlyFee: false,
    feeYear: '',
    feeMonth: '',
    feeDueBy: ''
  });
  const [isImposingMonthlyFee, setIsImposingMonthlyFee] = useState(false);
  const [showGrantPackageModal, setShowGrantPackageModal] = useState(false);
  const [grantPackages, setGrantPackages] = useState<Array<{ _id: string; name: string; price: number; isActive?: boolean }>>([]);
  const [grantPackageId, setGrantPackageId] = useState<string>('');
  const [grantReason, setGrantReason] = useState('');
  const [isGrantingPackage, setIsGrantingPackage] = useState(false);

  const [showRevokePackageModal, setShowRevokePackageModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokingPackage, setIsRevokingPackage] = useState(false);
  const [rollbackCommissionsOnRevoke, setRollbackCommissionsOnRevoke] = useState(false);

  const [showReferralStatsRecalcModal, setShowReferralStatsRecalcModal] = useState(false);
  const [isPreviewingReferralStats, setIsPreviewingReferralStats] = useState(false);
  const [isApplyingReferralStats, setIsApplyingReferralStats] = useState(false);
  const [referralStatsPreview, setReferralStatsPreview] = useState<{
    user?: { _id: string; name: string; email: string; referralCode?: string };
    changes: Array<{ field: string; oldValue: number; newValue: number; changed: boolean }>;
    hasChanges: boolean;
  } | null>(null);

  const [showLifetimeEarnedModal, setShowLifetimeEarnedModal] = useState(false);
  const [lifetimeEarnedInput, setLifetimeEarnedInput] = useState('');
  const [lifetimeEarnedReason, setLifetimeEarnedReason] = useState('');
  const [isSavingLifetimeEarned, setIsSavingLifetimeEarned] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [user._id]);

  const previewReferralStatsRecalc = async () => {
    try {
      setIsPreviewingReferralStats(true);
      setShowReferralStatsRecalcModal(true);
      setReferralStatsPreview(null);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/referral-stats/preview`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to preview referral stat changes', 'error');
        setShowReferralStatsRecalcModal(false);
        return;
      }
      setReferralStatsPreview({
        user: data?.user,
        changes: Array.isArray(data?.changes) ? data.changes : [],
        hasChanges: !!data?.hasChanges
      });
    } catch (e) {
      console.error('Preview referral stats error:', e);
      showToast('Failed to preview referral stat changes', 'error');
      setShowReferralStatsRecalcModal(false);
    } finally {
      setIsPreviewingReferralStats(false);
    }
  };

  const applyReferralStatsRecalc = async () => {
    try {
      setIsApplyingReferralStats(true);
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/referral-stats/apply`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to apply referral stat changes', 'error');
        return;
      }
      showToast('Referral stats recalculated and saved', 'success');
      setShowReferralStatsRecalcModal(false);
      setReferralStatsPreview(null);
      await fetchUserDetails();
    } catch (e) {
      console.error('Apply referral stats error:', e);
      showToast('Failed to apply referral stat changes', 'error');
    } finally {
      setIsApplyingReferralStats(false);
    }
  };

  const openLifetimeEarnedModal = () => {
    const cur = Number((currentUser as { lifetimeEarned?: number }).lifetimeEarned ?? 0);
    setLifetimeEarnedInput(Number.isFinite(cur) ? String(cur) : '0');
    setLifetimeEarnedReason('');
    setShowLifetimeEarnedModal(true);
  };

  const refreshUserSnapshot = async () => {
    const token = localStorage.getItem('token');
    const userResponse = await fetch(buildApiUrl(`api/admin/users/${user._id}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (userResponse.ok) {
      setCurrentUser(await userResponse.json());
    }
  };

  const handleSaveLifetimeEarned = async () => {
    const parsed = parseFloat(lifetimeEarnedInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      showToast('Enter a valid non-negative amount', 'error');
      return;
    }
    setIsSavingLifetimeEarned(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/lifetime-earned`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lifetimeEarned: parsed,
          reason: lifetimeEarnedReason.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to update lifetime earned', 'error');
        return;
      }
      showToast(data?.message || 'Lifetime earned updated', 'success');
      setShowLifetimeEarnedModal(false);
      await refreshUserSnapshot();
    } catch {
      showToast('Failed to update lifetime earned', 'error');
    } finally {
      setIsSavingLifetimeEarned(false);
    }
  };

  const handleResetLifetimeEarned = async () => {
    setIsSavingLifetimeEarned(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/lifetime-earned`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clearOverride: true,
          reason: lifetimeEarnedReason.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.error || 'Failed to reset lifetime earned', 'error');
        return;
      }
      showToast(data?.message || 'Reset to transaction total', 'success');
      setShowLifetimeEarnedModal(false);
      await refreshUserSnapshot();
    } catch {
      showToast('Failed to reset lifetime earned', 'error');
    } finally {
      setIsSavingLifetimeEarned(false);
    }
  };

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('[UserDetails] Fetching details for user:', user._id);
      
      // Fetch user details from multiple endpoints (including full user for emailUnreachable etc.)
      const [userRes, paymentsRes, withdrawalsRes, referralsRes, transactionsRes, treeRes, monthlyFeeRes] = await Promise.all([
        fetch(buildApiUrl(`api/admin/users/${user._id}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/payments`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/withdrawals`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/referrals`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/transactions`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/referral-tree`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(buildApiUrl(`api/admin/users/${user._id}/monthly-fee-status`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (userRes.ok) {
        const fullUser = await userRes.json();
        setCurrentUser(fullUser);
      }

      console.log('[UserDetails] Responses:', {
        payments: paymentsRes.status,
        withdrawals: withdrawalsRes.status,
        referrals: referralsRes.status,
        transactions: transactionsRes.status,
        tree: treeRes.status
      });

      const payments = paymentsRes.ok ? await paymentsRes.json() : [];
      const withdrawals = withdrawalsRes.ok ? await withdrawalsRes.json() : [];
      const referrals = referralsRes.ok ? await referralsRes.json() : [];
      const transactions = transactionsRes.ok ? await transactionsRes.json() : [];
      let referralTree = null;
      if (treeRes.ok) {
        try {
          referralTree = await treeRes.json();
          console.log('[UserDetails] Referral tree data:', referralTree);
        } catch (parseError) {
          console.error('[UserDetails] Failed to parse referral tree:', parseError);
        }
      } else {
        console.error('[UserDetails] Failed to fetch referral tree:', treeRes.status, await treeRes.text().catch(() => ''));
      }

      if (monthlyFeeRes.ok) {
        try {
          setMonthlyFeeStatus(await monthlyFeeRes.json());
        } catch {
          setMonthlyFeeStatus(null);
        }
      } else {
        setMonthlyFeeStatus(null);
      }

      console.log('[UserDetails] Fetched data:', {
        paymentsCount: payments.length,
        withdrawalsCount: withdrawals.length,
        referralsCount: referrals.length,
        transactionsCount: transactions.length,
        referralTree: referralTree ? {
          hasTree: !!referralTree.tree,
          treeLength: referralTree.tree?.length || 0,
          hasStats: !!referralTree.stats,
          hasRootUser: !!referralTree.rootUser
        } : null
      });

      // Calculate totals
      const completedPayments = Array.isArray(payments) ? payments.filter((p: any) => p.status === 'completed') : [];
      const packagePayment = completedPayments.find((p: any) => p.type === 'package');
      
      const totalEarnings = completedPayments.reduce((sum: number, p: any) => sum + (p.finalAmount || p.amount || 0), 0);
      const completedWithdrawals = Array.isArray(withdrawals) ? withdrawals.filter((w: any) => w.status === 'completed') : [];

      setDetails({
        payments: Array.isArray(payments) ? payments : [],
        withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
        referrals: Array.isArray(referrals) ? referrals : [],
        transactions: Array.isArray(transactions) ? transactions : [],
        referralTree: referralTree || null,
        package: packagePayment ? {
          name: packagePayment.package?.name || 'Unknown',
          price: packagePayment.package?.price || 0,
          expiresAt: packagePayment.expiresAt
        } : null,
        totalEarnings,
        pendingCommissions: (user as any).balance || 0,
        completedReferrals: Array.isArray(referrals) ? referrals.filter((r: any) => r.isActive).length : 0
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      setMonthlyFeeStatus(null);
      // Set empty details on error
      setDetails({
        payments: [],
        withdrawals: [],
        referrals: [],
        transactions: [],
        referralTree: null,
        package: null,
        totalEarnings: 0,
        pendingCommissions: (user as any).balance || 0,
        completedReferrals: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const openGrantPackageModal = async () => {
    setShowGrantPackageModal(true);
    setGrantReason('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl('api/admin/packages'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const rows = await res.json();
        const active = Array.isArray(rows) ? rows.filter((p: any) => p && p.isActive !== false) : [];
        setGrantPackages(active);
        if (!grantPackageId && active.length) setGrantPackageId(active[0]._id);
      }
    } catch {
      // ignore
    }
  };

  const handleGrantPackage = async () => {
    if (!grantPackageId) {
      showToast('Select a package', 'error');
      return;
    }
    setIsGrantingPackage(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/grant-package`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packageId: grantPackageId,
          reason: grantReason.trim() || undefined,
          activate: true
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as any)?.error || 'Failed to grant package', 'error');
        return;
      }
      showToast('Package granted and account activated', 'success');
      setShowGrantPackageModal(false);
      await fetchUserDetails();
    } catch (e) {
      console.error(e);
      showToast('Failed to grant package', 'error');
    } finally {
      setIsGrantingPackage(false);
    }
  };

  const openRevokePackageModal = () => {
    setRevokeReason('');
    setRollbackCommissionsOnRevoke(false);
    setShowRevokePackageModal(true);
  };

  const handleRevokePackage = async () => {
    setIsRevokingPackage(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/revoke-package`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: revokeReason.trim() || undefined,
          rollbackCommissions: rollbackCommissionsOnRevoke
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as any)?.error || 'Failed to revoke package', 'error');
        return;
      }
      showToast('Package revoked successfully', 'success');
      setShowRevokePackageModal(false);
      await fetchUserDetails();
    } catch (e) {
      console.error(e);
      showToast('Failed to revoke package', 'error');
    } finally {
      setIsRevokingPackage(false);
    }
  };

  const handleBalanceAction = async () => {
    if (!balanceForm.amount || !balanceForm.description) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/users/${user._id}/${balanceAction}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(balanceForm)
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Balance ${balanceAction} successful!`, 'success');
        setShowBalanceModal(false);
        setBalanceForm({ amount: '', description: '', notes: '' });
        
        // Fetch fresh user data
        const userResponse = await fetch(buildApiUrl(`api/admin/users/${user._id}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userResponse.ok) {
          const freshUserData = await userResponse.json();
          setCurrentUser(freshUserData);
        }
        
        // Refresh all details including transactions
        await fetchUserDetails();
      } else {
        showToast(data.error || `Failed to ${balanceAction} balance`, 'error');
      }
    } catch (error) {
      console.error(`${balanceAction} balance error:`, error);
      showToast(`Error ${balanceAction}ing balance`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openBalanceModal = (action: 'credit' | 'debit' | 'bonus') => {
    setBalanceAction(action);
    setBalanceForm({ amount: '', description: '', notes: '' });
    setShowBalanceModal(true);
  };

  const monthlyStatusAny = monthlyFeeStatus as Record<string, unknown> | null;
  const canImposeMonthlyFee =
    !!monthlyStatusAny &&
    monthlyStatusAny.found !== false &&
    monthlyStatusAny.reason !== 'staff_exempt' &&
    monthlyStatusAny.reason !== 'no_completed_package';
  const imposeNeedsForceOption = !!(
    monthlyStatusAny &&
    monthlyStatusAny.reason !== 'no_completed_package' &&
    monthlyStatusAny.reason !== 'staff_exempt' &&
    (monthlyStatusAny.monthlyFeeEnabled === false || monthlyStatusAny.reason === 'package_config_missing')
  );

  const openImposeMonthlyFeeModal = () => {
    const m = monthlyFeeStatus as Record<string, any> | null;
    const def =
      m && typeof m.monthlyFeeAmount === 'number' && Number.isFinite(m.monthlyFeeAmount)
        ? String(m.monthlyFeeAmount)
        : '50';
    const period = defaultFeePeriod();
    const due = m?.dueForMonth;
    if (typeof due === 'string' && due) {
      const d = new Date(due);
      if (!Number.isNaN(d.getTime())) {
        period.year = String(d.getUTCFullYear());
        period.month = String(d.getUTCMonth() + 1).padStart(2, '0');
        period.dueBy = `${period.year}-${period.month}-${String(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()).padStart(2, '0')}`;
      }
    }
    setImposeMonthlyForm({
      amount: def,
      notes: '',
      blockAccess: true,
      forceWithoutMonthlyFee: false,
      feeYear: period.year,
      feeMonth: period.month,
      feeDueBy: period.dueBy
    });
    setShowImposeMonthlyFeeModal(true);
  };

  const handleImposeMonthlyFee = async () => {
    const amt = parseFloat(imposeMonthlyForm.amount);
    if (!Number.isFinite(amt) || amt < 0.01) {
      showToast('Enter a valid amount (min 0.01)', 'error');
      return;
    }
    if (imposeNeedsForceOption && !imposeMonthlyForm.forceWithoutMonthlyFee) {
      showToast('This package has no recurring monthly fee in settings — enable “Impose anyway” or adjust the package first.', 'error');
      return;
    }

    const feeForMonth = feeMonthString(imposeMonthlyForm.feeYear, imposeMonthlyForm.feeMonth);
    if (!feeForMonth || !imposeMonthlyForm.feeDueBy) {
      showToast('Select fee month, year, and pay-by date', 'error');
      return;
    }

    setIsImposingMonthlyFee(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/impose-monthly-fee`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amt,
          notes: imposeMonthlyForm.notes.trim() || undefined,
          blockAccessUntilPaid: imposeMonthlyForm.blockAccess,
          forceWithoutMonthlyFeePackage: imposeMonthlyForm.forceWithoutMonthlyFee || undefined,
          feeForMonth,
          feeDueBy: imposeMonthlyForm.feeDueBy
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error || 'Failed to impose monthly fee', 'error');
        return;
      }
      showToast('Monthly fee payment created for this user.', 'success');
      setShowImposeMonthlyFeeModal(false);
      await fetchUserDetails();
      const token2 = localStorage.getItem('token');
      const mfRes = await fetch(buildApiUrl(`api/admin/users/${user._id}/monthly-fee-status`), {
        headers: { Authorization: `Bearer ${token2}` }
      });
      if (mfRes.ok) setMonthlyFeeStatus(await mfRes.json());
    } catch (e) {
      console.error(e);
      showToast('Error imposing monthly fee', 'error');
    } finally {
      setIsImposingMonthlyFee(false);
    }
  };

  const handleEmailUnreachable = async (markUnreachable: boolean, reason?: string) => {
    setIsUpdatingUnreachable(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`api/admin/users/${user._id}/email-unreachable`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailUnreachable: markUnreachable, reason: reason || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser((prev: any) => ({ ...prev, ...data.user }));
        showToast(data.message || (markUnreachable ? 'Email marked as unreachable' : 'Email marked as reachable'), 'success');
        setShowUnreachableModal(false);
        setUnreachableReason('');
      } else {
        showToast(data.error || 'Failed to update email status', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to update email status', 'error');
    } finally {
      setIsUpdatingUnreachable(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'bonus':
      case 'referral_commission':
      case 'payment':
        return <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'debit':
      case 'withdrawal':
        return <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const ReferralTreeNode = ({ node, isLast = false }: { node: any; isLast?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="relative">
        <div className={`flex items-start space-x-3 ${!isLast ? 'mb-4' : ''}`}>
          {/* Connector Line */}
          {node.level > 1 && (
            <div className="absolute left-0 top-0 w-6 h-6 border-l-2 border-b-2 border-gray-300 dark:border-gray-600 rounded-bl-lg -ml-6" />
          )}
          
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-colors"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowUpRight className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </motion.div>
            </button>
          )}
          
          {/* User Card */}
          <div className={`flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 ${hasChildren && !isExpanded ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {node.firstName?.charAt(0) || 'U'}{node.lastName?.charAt(0) || ''}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {node.firstName} {node.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{node.email}</p>
                  {hasChildren && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {node.childrenCount} direct • {node.totalDescendants} total
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(node.isActive ? 'active' : 'inactive')}`}>
                    {node.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {node.isVerified && (
                    <span title="Verified">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </span>
                  )}
                </div>
                {node.balance > 0 && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    ${node.balance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-9 pl-6 border-l-2 border-gray-300 dark:border-gray-600"
          >
            {node.children.map((child: any, index: number) => (
              <ReferralTreeNode 
                key={child._id} 
                node={child} 
                isLast={index === node.children.length - 1}
              />
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">{(user.firstName || user.email || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-blue-100">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading user details...</span>
            </div>
          ) : details ? (
            <>
              {/* Balance Actions */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => openBalanceModal('credit')}
                  className="min-w-[220px] flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Credit Balance
                </button>
                <button
                  onClick={() => openBalanceModal('debit')}
                  className="min-w-[220px] flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold"
                >
                  <Minus className="w-5 h-5" />
                  Debit Balance
                </button>
                <button
                  onClick={() => openBalanceModal('bonus')}
                  className="min-w-[220px] flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-semibold"
                >
                  <Gift className="w-5 h-5" />
                  Send Bonus
                </button>
                <button
                  type="button"
                  onClick={openGrantPackageModal}
                  className="min-w-[220px] flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 font-semibold"
                >
                  <Package className="w-5 h-5" />
                  Grant Package
                </button>
                <button
                  type="button"
                  onClick={openRevokePackageModal}
                  className="min-w-[220px] flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-xl hover:from-rose-700 hover:to-red-800 transition-all duration-200 font-semibold"
                >
                  <X className="w-5 h-5" />
                  Revoke Package
                </button>
              </div>

              {canImposeMonthlyFee && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={openImposeMonthlyFeeModal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 font-semibold border border-amber-500/30"
                  >
                    <Receipt className="w-5 h-5" />
                    Impose monthly fee (pending payment)
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Creates the same pending USDT monthly-fee record as when the student starts payment — for custom
                    charges or corrections. Optional: block the app until it is paid.
                  </p>
                </div>
              )}

              {/* Stats row 1 — same card size as before */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">BALANCE</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${(() => {
                      if (details.transactions && details.transactions.length > 0) {
                        return details.transactions[0].balanceAfter.toFixed(2);
                      }
                      return ((currentUser as any).balance || 0).toFixed(2);
                    })()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Available USDT</p>
                </div>

                <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2 pr-8">
                    <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {(currentUser as { lifetimeEarnedIsOverride?: boolean }).lifetimeEarnedIsOverride ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200">
                          Admin set
                        </span>
                      ) : null}
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">LIFETIME EARNED</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${Number((currentUser as any).lifetimeEarned || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Rank progress (withdrawals do not reduce this)
                  </p>
                  {(currentUser as { lifetimeEarnedIsOverride?: boolean }).lifetimeEarnedIsOverride &&
                  (currentUser as { lifetimeEarnedComputed?: number }).lifetimeEarnedComputed != null ? (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Transaction total: $
                      {Number((currentUser as { lifetimeEarnedComputed?: number }).lifetimeEarnedComputed || 0).toFixed(
                        2
                      )}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={openLifetimeEarnedModal}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/40"
                    title="Edit lifetime earned"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">RANK</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {(currentUser as any).rankRewards?.current?.name || '—'}
                  </p>
                  {(currentUser as any).rankRewards?.next?.threshold ? (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Next: {(currentUser as any).rankRewards?.next?.name} @ $
                      {Number((currentUser as any).rankRewards?.next?.threshold || 0).toFixed(0)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">No next rank</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-800/20 rounded-xl p-4 border border-sky-200 dark:border-sky-800">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-medium text-sky-700 dark:text-sky-400">BUSINESS VOLUME</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${Number((currentUser as any).directBusinessVolumeUsd || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Direct referrals (packages)</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">REFERRALS</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{details.completedReferrals}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active Referrals</p>
                </div>
              </div>

              {/* Stats row 2 — package + monthly fee, equal width like row 1 cards */}
              <div
                className={`grid gap-4 mb-6 ${
                  monthlyFeeStatus && (monthlyFeeStatus as any).found !== false
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 flex flex-col min-h-[120px]">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">PACKAGE</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{details.package?.name || 'None'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {details.package ? `$${details.package.price}` : 'No active package'}
                  </p>
                </div>

                {monthlyFeeStatus && (monthlyFeeStatus as any).found !== false && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex flex-col min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">MONTHLY FEE</span>
                    </div>
                    <div className="flex justify-end mb-2 -mt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('monthly_fee')}
                        className="text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline inline-flex items-center gap-0.5"
                        title="Payment history and actions"
                      >
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">History &amp; actions</span>
                        <span className="sm:hidden">History</span>
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto max-h-[200px] pr-1">
                      {(() => {
                        const m = monthlyFeeStatus as Record<string, any>;
                        if (m.reason === 'staff_exempt') {
                          return (
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                              Not applicable for this role (admin / teacher / instructor).
                            </p>
                          );
                        }
                        if (m.reason === 'no_completed_package') {
                          return (
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                              No completed package purchase yet — monthly fee rules do not apply.
                            </p>
                          );
                        }
                        if (m.reason === 'package_config_missing') {
                          return (
                            <div className="space-y-1 text-xs leading-snug">
                              <p className="text-amber-800 dark:text-amber-300 font-medium">Package config not found</p>
                              <p className="text-gray-600 dark:text-gray-400">
                                Name: <span className="font-mono">{m.packageNameFromPayment || '—'}</span>
                              </p>
                            </div>
                          );
                        }
                        if (m.monthlyFeeEnabled === false) {
                          return (
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                              <span className="font-semibold text-gray-900 dark:text-white">{m.packageName || 'Package'}</span>{' '}
                              — no monthly fee (lifetime or disabled in package settings).
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  ${Number(m.monthlyFeeAmount ?? 50).toFixed(2)}/mo
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Grace</p>
                                <p className="font-medium text-gray-900 dark:text-white">First {m.graceDays ?? 3}d UTC</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Due</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {m.dueForMonth ? formatDate(m.dueForMonth) : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Paid cycle</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {m.paidForCurrentCycle ? (
                                    <span className="text-green-600 dark:text-green-400">Yes</span>
                                  ) : (
                                    <span className="text-red-600 dark:text-red-400">No</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {m.withinFullFreeWindow && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                                  Free months
                                </span>
                              )}
                              {m.requiredMonthWaived && !m.withinFullFreeWindow && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                  Waived
                                </span>
                              )}
                              {m.withinGracePeriod && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200">
                                  Grace
                                </span>
                              )}
                              {m.isOverdueForAdminList && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                                  Overdue ({m.daysOverdue ?? 0}d)
                                </span>
                              )}
                              {m.isAccessBlocked && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100">
                                  Blocked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email || 'N/A'}</p>
                        {(currentUser as any).emailUnreachable ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <MailX className="w-3.5 h-3.5" /> Unreachable
                            </span>
                            <button
                              onClick={() => handleEmailUnreachable(false)}
                              disabled={isUpdatingUnreachable}
                              className="text-xs px-2 py-1 rounded border border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                            >
                              {isUpdatingUnreachable ? 'Updating...' : 'Mark reachable'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowUnreachableModal(true)}
                            disabled={isUpdatingUnreachable}
                            className="text-xs px-2 py-1 rounded border border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                          >
                            Mark unreachable
                          </button>
                        )}
                      </div>
                      {(currentUser as any).emailUnreachableReason && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reason: {(currentUser as any).emailUnreachableReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Country</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.country || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Joined</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex space-x-1 overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'transactions', label: 'Transactions', icon: History },
                    { id: 'payments', label: 'Payments', icon: CreditCard },
                    { id: 'monthly_fee', label: 'Monthly fee', icon: CalendarClock },
                    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
                    { id: 'referrals', label: 'Referrals', icon: Users },
                    { id: 'email', label: 'Email', icon: Mail }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Recent Activity
                    </h5>
                    <div className="space-y-3">
                      {details.transactions.slice(0, 8).map((transaction) => (
                        <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.amount > 0 
                                ? 'bg-green-100 dark:bg-green-900/20' 
                                : 'bg-red-100 dark:bg-red-900/20'
                            }`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white capitalize">
                                {transaction.type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.description}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(transaction.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              transaction.amount > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''} ${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Balance: ${transaction.balanceAfter.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {details.transactions.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.payments.map((payment) => (
                        <tr key={payment._id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white capitalize">{payment.type}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">${payment.amount}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{payment.paymentMethod}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.payments.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No payments found
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'monthly_fee' && (
                <div className="min-h-[200px]">
                  <MonthlyFeeHistoryPanel
                    userId={user._id}
                    embedded
                    onConfirmed={() => {
                      void fetchUserDetails();
                    }}
                  />
                </div>
              )}

              {activeTab === 'withdrawals' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Network</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.withdrawals.map((withdrawal) => (
                        <tr key={withdrawal._id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">${withdrawal.amount}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{withdrawal.network}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}>
                              {withdrawal.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(withdrawal.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.withdrawals.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No withdrawals found
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'referrals' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Referrals</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Preview & save recalculated <span className="font-mono">user.referralStats</span> counters.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={previewReferralStatsRecalc}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                      title="Preview recalculated referral stats"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Recalculate referral stats
                    </button>
                  </div>

                  {/* Referral Rank & Stats */}
                  {details.referralTree && details.referralTree.stats && (
                    <div className="space-y-4">
                      {/* Rank card */}
                      {details.referralTree.stats.rank && (
                        <div className="bg-white dark:bg-gray-900/70 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Referral Rank</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {details.referralTree.stats.rank.current?.name || 'Getting Started'}
                                </p>
                                {details.referralTree.stats.rank.current?.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {details.referralTree.stats.rank.current.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {details.referralTree.stats.rank.next && (
                              <div className="text-xs text-right text-gray-600 dark:text-gray-300 space-y-0.5">
                                <p className="font-medium">
                                  Next: {details.referralTree.stats.rank.next.name}
                                </p>
                                <p>
                                  {(details.referralTree.stats.directVerifiedReferrals ?? 0)} /{' '}
                                  {details.referralTree.stats.rank.next.minDirects ?? 0} verified directs
                                </p>
                                <p>
                                  {(details.referralTree.stats.totalReferrals || 0)} /{' '}
                                  {details.referralTree.stats.rank.next.minReferrals ?? 0} total team
                                </p>
                              </div>
                            )}
                          </div>

                          {details.referralTree.stats.rank.next && (
                            <div className="mt-3 space-y-1">
                              <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        (details.referralTree.stats.rank.progressToNext ?? 0) * 100
                                      )
                                    )}%`
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Need{' '}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {Math.max(
                                    0,
                                    (details.referralTree.stats.rank.next?.minDirects ?? 0) -
                                      (details.referralTree.stats.directVerifiedReferrals ?? 0)
                                  )}
                                </span>{' '}
                                more verified directs and{' '}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {Math.max(
                                    0,
                                    (details.referralTree.stats.rank.next?.minReferrals ?? 0) -
                                      (details.referralTree.stats.totalReferrals || 0)
                                  )}
                                </span>{' '}
                                more total to reach {details.referralTree.stats.rank.next?.name}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Basic stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">TOTAL TEAM</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {details.referralTree.stats.totalReferrals ?? 0}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">DIRECT REFERRALS</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {details.referralTree.stats.directReferrals ?? details.referralTree.stats.totalReferrals ?? 0}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">ACTIVE</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {details.referralTree.stats.activeReferrals ?? 0}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">VERIFIED</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {details.referralTree.stats.verifiedReferrals ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Referral Tree */}
                  <div>
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                      Referral Network Tree
                    </h5>
                    
                    {details.referralTree && details.referralTree.tree && Array.isArray(details.referralTree.tree) ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        {/* Upline / Referral Leader */}
                        {details.referralTree.referredBy && (
                          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                              Referred by (signup link used)
                            </p>
                            <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-bold">
                                    {details.referralTree.referredBy.firstName?.charAt(0) || 'U'}
                                    {details.referralTree.referredBy.lastName?.charAt(0) || ''}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                                    {details.referralTree.referredBy.firstName} {details.referralTree.referredBy.lastName}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                    {details.referralTree.referredBy.email}
                                  </p>
                                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                    Referral Code: {details.referralTree.referredBy.referralCode || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Root User */}
                        {details.referralTree.rootUser && (
                          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || ''}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                  Referral Code: {details.referralTree.rootUser.referralCode || (user as any).referralCode || 'N/A'}
                                </p>
                                {details.referralTree.rootUser.parentReferralCode && !details.referralTree.referredBy && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Signed up with referral code: {details.referralTree.rootUser.parentReferralCode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tree */}
                        {details.referralTree.tree.length > 0 ? (
                          <div className="space-y-2">
                            {details.referralTree.tree.map((node: any, index: number) => (
                              <ReferralTreeNode 
                                key={node._id || index} 
                                node={node} 
                                isLast={index === details.referralTree.tree.length - 1}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No referrals yet</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">Loading referral tree...</p>
                        {!details.referralTree && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Unable to load referral data</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div>
                  <EmailHistory userIdFilter={user._id} hideUserIdFilter />
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">By</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.transactions.map((transaction) => (
                        <tr key={transaction._id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getTransactionIcon(transaction.type)}
                              <span className="text-sm capitalize text-gray-900 dark:text-white">{transaction.type.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-semibold ${
                              transaction.amount > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''} ${Math.abs(transaction.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            ${transaction.balanceAfter.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-gray-900 dark:text-white">{transaction.description}</p>
                            {transaction.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{transaction.notes}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {transaction.performedBy ? 
                              `${transaction.performedBy.firstName || ''} ${transaction.performedBy.lastName || ''}`.trim() || 'Admin' 
                              : 'System'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(transaction.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {details.transactions.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No transactions found
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Email unreachable reason modal */}
      {showUnreachableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MailX className="w-5 h-5 text-amber-500" />
                Mark email unreachable
              </h3>
              <button
                onClick={() => { setShowUnreachableModal(false); setUnreachableReason(''); }}
                disabled={isUpdatingUnreachable}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              No further emails will be sent to this user until you mark the email as reachable again.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reason (optional)</label>
              <textarea
                value={unreachableReason}
                onChange={(e) => setUnreachableReason(e.target.value)}
                placeholder="e.g. Bounce, invalid address"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                disabled={isUpdatingUnreachable}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnreachableModal(false); setUnreachableReason(''); }}
                disabled={isUpdatingUnreachable}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEmailUnreachable(true, unreachableReason)}
                disabled={isUpdatingUnreachable}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdatingUnreachable ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Mark unreachable
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Impose monthly fee modal */}
      {showImposeMonthlyFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Impose monthly fee
              </h3>
              <button
                type="button"
                onClick={() => !isImposingMonthlyFee && setShowImposeMonthlyFeeModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={isImposingMonthlyFee}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Adds a <strong>pending</strong> monthly fee payment. The student uses the Monthly fee / payment portal
              (wallet, hash, screenshot) like a normal cycle fee.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USDT) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={imposeMonthlyForm.amount}
                  onChange={(e) => setImposeMonthlyForm({ ...imposeMonthlyForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isImposingMonthlyFee}
                />
              </div>
              <ImposeMonthlyFeeDateFields
                feeYear={imposeMonthlyForm.feeYear}
                feeMonth={imposeMonthlyForm.feeMonth}
                feeDueBy={imposeMonthlyForm.feeDueBy}
                onFeeYearChange={(feeYear) => setImposeMonthlyForm({ ...imposeMonthlyForm, feeYear })}
                onFeeMonthChange={(feeMonth) => setImposeMonthlyForm({ ...imposeMonthlyForm, feeMonth })}
                onFeeDueByChange={(feeDueBy) => setImposeMonthlyForm({ ...imposeMonthlyForm, feeDueBy })}
                disabled={isImposingMonthlyFee}
              />
              <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={imposeMonthlyForm.blockAccess}
                  onChange={(e) => setImposeMonthlyForm({ ...imposeMonthlyForm, blockAccess: e.target.checked })}
                  disabled={isImposingMonthlyFee}
                  className="mt-1 rounded"
                />
                <span>
                  <strong>Block platform access</strong> until this fee is completed (skips grace period for this
                  charge). Leave off if they should only be billed on the normal schedule.
                </span>
              </label>
              {imposeNeedsForceOption && (
                <label className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={imposeMonthlyForm.forceWithoutMonthlyFee}
                    onChange={(e) =>
                      setImposeMonthlyForm({ ...imposeMonthlyForm, forceWithoutMonthlyFee: e.target.checked })
                    }
                    disabled={isImposingMonthlyFee}
                    className="mt-1 rounded"
                  />
                  <span>
                    <strong>Impose anyway</strong> —{' '}
                    {(monthlyStatusAny as { reason?: string })?.reason === 'package_config_missing'
                      ? 'the package row could not be matched from their payment (use for one-off charges).'
                      : 'this package tier has monthly fee turned off in package settings. Only use for one-off administrative charges.'}
                  </span>
                </label>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  value={imposeMonthlyForm.notes}
                  onChange={(e) => setImposeMonthlyForm({ ...imposeMonthlyForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Reason for this fee (stored on the payment record)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={isImposingMonthlyFee}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImposeMonthlyFeeModal(false)}
                  disabled={isImposingMonthlyFee}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImposeMonthlyFee}
                  disabled={isImposingMonthlyFee}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isImposingMonthlyFee ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  Create pending fee
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showLifetimeEarnedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit lifetime earned</h3>
              <button
                type="button"
                onClick={() => setShowLifetimeEarnedModal(false)}
                disabled={isSavingLifetimeEarned}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Updates rank tier progress only. Does not change the user&apos;s withdrawable balance.
            </p>
            {(currentUser as { lifetimeEarnedComputed?: number }).lifetimeEarnedComputed != null && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                Sum from balance transactions: $
                {Number((currentUser as { lifetimeEarnedComputed?: number }).lifetimeEarnedComputed || 0).toFixed(2)}
              </p>
            )}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lifetime earned (USD)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={lifetimeEarnedInput}
              onChange={(e) => setLifetimeEarnedInput(e.target.value)}
              disabled={isSavingLifetimeEarned}
              className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={lifetimeEarnedReason}
              onChange={(e) => setLifetimeEarnedReason(e.target.value)}
              disabled={isSavingLifetimeEarned}
              placeholder="e.g. manual correction for rank rewards"
              className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleSaveLifetimeEarned()}
                disabled={isSavingLifetimeEarned}
                className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingLifetimeEarned ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </button>
              <button
                type="button"
                onClick={() => void handleResetLifetimeEarned()}
                disabled={isSavingLifetimeEarned}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Reset to transaction total
              </button>
              <button
                type="button"
                onClick={() => setShowLifetimeEarnedModal(false)}
                disabled={isSavingLifetimeEarned}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Balance Action Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                {balanceAction === 'bonus' ? 'Send Bonus' : `${balanceAction} Balance`}
              </h3>
              <button 
                onClick={() => setShowBalanceModal(false)}
                disabled={isProcessing}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Current Balance:</strong> ${(() => {
                    // Use the most recent transaction balance if available
                    if (details && details.transactions && details.transactions.length > 0) {
                      return details.transactions[0].balanceAfter.toFixed(2);
                    }
                    return ((currentUser as any).balance || 0).toFixed(2);
                  })()} USDT
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
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={balanceForm.description}
                  onChange={(e) => setBalanceForm({ ...balanceForm, description: e.target.value })}
                  placeholder="Reason for this transaction"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={balanceForm.notes}
                  onChange={(e) => setBalanceForm({ ...balanceForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBalanceModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBalanceAction}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    balanceAction === 'credit' ? 'bg-green-600 hover:bg-green-700' :
                    balanceAction === 'debit' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {balanceAction === 'credit' && <Plus className="w-4 h-4" />}
                      {balanceAction === 'debit' && <Minus className="w-4 h-4" />}
                      {balanceAction === 'bonus' && <Gift className="w-4 h-4" />}
                      {balanceAction === 'bonus' ? 'Send Bonus' : `${balanceAction.charAt(0).toUpperCase() + balanceAction.slice(1)} Balance`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Grant Package Modal */}
      {showGrantPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Grant package &amp; activate
              </h3>
              <button
                type="button"
                onClick={() => !isGrantingPackage && setShowGrantPackageModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={isGrantingPackage}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This creates an admin-granted completed package payment, verifies the account, enrolls the user in published
              courses, and distributes referral commissions like a normal package purchase.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package *</label>
                <select
                  value={grantPackageId}
                  onChange={(e) => setGrantPackageId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isGrantingPackage}
                >
                  {grantPackages.length === 0 ? (
                    <option value="">No packages found</option>
                  ) : (
                    grantPackages.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — ${Number(p.price || 0).toFixed(0)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Manual activation / scholarship"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={isGrantingPackage}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantPackageModal(false)}
                  disabled={isGrantingPackage}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGrantPackage}
                  disabled={isGrantingPackage || !grantPackageId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGrantingPackage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Grant package
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Revoke Package Modal */}
      {showRevokePackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <X className="w-5 h-5 text-red-600" />
                Revoke granted package
              </h3>
              <button
                type="button"
                onClick={() => !isRevokingPackage && setShowRevokePackageModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={isRevokingPackage}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This revokes the most recent admin-granted package for this user and removes their package access.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Chargeback / mistake"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  disabled={isRevokingPackage}
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={rollbackCommissionsOnRevoke}
                  onChange={(e) => setRollbackCommissionsOnRevoke(e.target.checked)}
                  disabled={isRevokingPackage}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span>
                  Also rollback all commissions distributed from this package (creates reversing transactions).
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokePackageModal(false)}
                  disabled={isRevokingPackage}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokePackage}
                  disabled={isRevokingPackage}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRevokingPackage ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Revoke package
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Referral stats recalculation preview modal */}
      {showReferralStatsRecalcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview referral stat changes</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {referralStatsPreview?.user?.name || `${user.firstName} ${user.lastName}`} ({referralStatsPreview?.user?.email || user.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isApplyingReferralStats) return;
                  setShowReferralStatsRecalcModal(false);
                  setReferralStatsPreview(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                disabled={isApplyingReferralStats}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPreviewingReferralStats && (
              <div className="py-10 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading preview...
              </div>
            )}

            {!isPreviewingReferralStats && referralStatsPreview && (
              <>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200">Field</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200">Previous</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200">New</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(referralStatsPreview.changes || []).map((c) => (
                        <tr key={c.field} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white font-mono">{c.field}</td>
                          <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-200">
                            {Number(c.oldValue || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-200">
                            {Number(c.newValue || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {c.changed ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                                Will change
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                No change
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!referralStatsPreview.hasChanges && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                    Nothing would change — current values already match the recalculated stats.
                  </p>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (isApplyingReferralStats) return;
                      setShowReferralStatsRecalcModal(false);
                      setReferralStatsPreview(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={isApplyingReferralStats}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyReferralStatsRecalc}
                    disabled={isApplyingReferralStats || !referralStatsPreview.hasChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isApplyingReferralStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Apply changes
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
