'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Search, Eye, CheckCircle, X, CreditCard, Wallet, 
  ArrowUpRight, Clock, AlertCircle, Edit, Save, XCircle, 
  RefreshCw, Filter, DollarSign, User as UserIcon, Trash2, Loader2, ImageIcon
} from 'lucide-react';
import { Payment } from './types';
import { buildApiUrl } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

interface Withdrawal {
  _id: string;
  amount: number;
  currency: string;
  walletAddress: string;
  network: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  transactionHash?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    balance?: number;
  };
  processedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  balance?: number;
}

interface PaymentManagementProps {
  payments: Payment[];
  withdrawals?: Withdrawal[];
  users?: User[];
  onPaymentStatusUpdate: (paymentId: string, newStatus: string) => void;
  onExportPayments: () => void;
  onRefresh?: () => void;
}

export default function PaymentManagement({ 
  payments, 
  withdrawals = [],
  users = [],
  onPaymentStatusUpdate, 
  onExportPayments,
  onRefresh
}: PaymentManagementProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'withdrawals' | 'balance'>('payments');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [withdrawalSearchTerm, setWithdrawalSearchTerm] = useState('');
  const [balanceSearchTerm, setBalanceSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [newBalance, setNewBalance] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [withdrawalTransactionHash, setWithdrawalTransactionHash] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<Set<string>>(new Set());
  const [deletedWithdrawalIds, setDeletedWithdrawalIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);


  const openPaymentModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const openWithdrawalModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setWithdrawalTransactionHash('');
    setWithdrawalNotes('');
    setRejectionReason('');
    setShowWithdrawalModal(true);
  };

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setNewBalance((user.balance || 0).toString());
    setBalanceReason('');
    setShowBalanceModal(true);
  };

  // Filter payments
  const filteredPayments = (payments || []).filter(payment => {
    const term = paymentSearchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      (payment.user?.firstName?.toLowerCase().includes(term) || false) ||
      (payment.user?.lastName?.toLowerCase().includes(term) || false) ||
      (payment.user?.email?.toLowerCase().includes(term) || false) ||
      payment._id.toLowerCase().includes(term) ||
      (payment.transactionId?.toLowerCase().includes(term) || false) ||
      (payment.binanceWallet?.transactionHash?.toLowerCase().includes(term) || false)
    );
    
    const matchesStatus = paymentStatusFilter === 'all' || payment.status === paymentStatusFilter;
    const matchesMethod = paymentMethodFilter === 'all' || payment.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Filter withdrawals (exclude deleted ones immediately)
  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    // Exclude deleted withdrawals immediately
    if (deletedWithdrawalIds.has(withdrawal._id)) {
      return false;
    }
    
    const matchesSearch = 
      (withdrawal.user?.firstName?.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) || false) ||
      (withdrawal.user?.lastName?.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) || false) ||
      withdrawal._id.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) ||
      withdrawal.walletAddress.toLowerCase().includes(withdrawalSearchTerm.toLowerCase());
    
    const matchesStatus = withdrawalStatusFilter === 'all' || withdrawal.status === withdrawalStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter users for balance editing
  const filteredUsers = users.filter(user => {
    const searchLower = balanceSearchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Clear deleted withdrawal IDs when withdrawals are refreshed
  useEffect(() => {
    // Only keep IDs that still exist in the withdrawals array
    setDeletedWithdrawalIds(prev => {
      const withdrawalIds = new Set(withdrawals.map(w => w._id));
      return new Set(Array.from(prev).filter(id => !withdrawalIds.has(id)));
    });
  }, [withdrawals]);

  const handleCompleteWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    try {
      setIsProcessingWithdrawal(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl(`api/admin/withdrawals/${selectedWithdrawal._id}/complete`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionHash: withdrawalTransactionHash,
          notes: withdrawalNotes
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Withdrawal completed successfully!', 'success');
        setShowWithdrawalModal(false);
        if (onRefresh) onRefresh();
      } else {
        showToast(data.message || 'Failed to complete withdrawal', 'error');
      }
    } catch (error) {
      console.error('Complete withdrawal error:', error);
      showToast('Error completing withdrawal', 'error');
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  const handleSelectWithdrawal = (withdrawalId: string) => {
    const newSelected = new Set(selectedWithdrawals);
    if (newSelected.has(withdrawalId)) {
      newSelected.delete(withdrawalId);
    } else {
      newSelected.add(withdrawalId);
    }
    setSelectedWithdrawals(newSelected);
  };

  const handleSelectAllWithdrawals = () => {
    if (selectedWithdrawals.size === filteredWithdrawals.length) {
      setSelectedWithdrawals(new Set());
    } else {
      setSelectedWithdrawals(new Set(filteredWithdrawals.map(w => w._id)));
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (!window.confirm('Are you sure you want to delete this withdrawal request? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      
      // Optimistic update: remove from UI immediately by filtering out the deleted withdrawal
      // We'll update the parent component's withdrawals array through onRefresh after success
      
      const response = await fetch(buildApiUrl(`api/admin/withdrawals/${withdrawalId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Immediately remove from UI
        setDeletedWithdrawalIds(prev => new Set(prev).add(withdrawalId));
        showToast('Withdrawal deleted successfully', 'success');
        // Remove from selected withdrawals if it was selected
        const newSelected = new Set(selectedWithdrawals);
        newSelected.delete(withdrawalId);
        setSelectedWithdrawals(newSelected);
        // Refresh to sync with backend
        if (onRefresh) onRefresh();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete withdrawal', 'error');
        // Refresh to restore the withdrawal if deletion failed
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Delete withdrawal error:', error);
      showToast('Error deleting withdrawal', 'error');
      // Refresh to restore the withdrawal if deletion failed
      if (onRefresh) onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteWithdrawals = async () => {
    if (selectedWithdrawals.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedWithdrawals.size} withdrawal request(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const withdrawalIds = Array.from(selectedWithdrawals);
      
      const response = await fetch(buildApiUrl('api/admin/withdrawals'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ withdrawalIds })
      });

      if (response.ok) {
        const data = await response.json();
        // Immediately remove from UI
        setDeletedWithdrawalIds(prev => {
          const newSet = new Set(prev);
          withdrawalIds.forEach(id => newSet.add(id));
          return newSet;
        });
        showToast(`${data.deletedCount || selectedWithdrawals.size} withdrawal(s) deleted successfully!`, 'success');
        setSelectedWithdrawals(new Set());
        // Refresh to sync with backend
        if (onRefresh) onRefresh();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete withdrawals', 'error');
        // Refresh to restore withdrawals if deletion failed
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Bulk delete withdrawals error:', error);
      showToast('Error deleting withdrawals', 'error');
      // Refresh to restore withdrawals if deletion failed
      if (onRefresh) onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    try {
      setIsProcessingWithdrawal(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl(`api/admin/withdrawals/${selectedWithdrawal._id}/reject`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: rejectionReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Withdrawal rejected successfully!', 'success');
        setShowWithdrawalModal(false);
        if (onRefresh) onRefresh();
      } else {
        showToast(data.error || data.message || 'Failed to reject withdrawal', 'error');
      }
    } catch (error) {
      console.error('Reject withdrawal error:', error);
      showToast('Error rejecting withdrawal', 'error');
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;

    const balance = parseFloat(newBalance);
    if (isNaN(balance) || balance < 0) {
      showToast('Please enter a valid balance', 'error');
      return;
    }

    try {
      setIsUpdatingBalance(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl(`api/admin/users/${selectedUser._id}/balance`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          balance,
          reason: balanceReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('User balance updated successfully!', 'success');
        setShowBalanceModal(false);
        if (onRefresh) onRefresh();
      } else {
        showToast(data.message || 'Failed to update balance', 'error');
      }
    } catch (error) {
      console.error('Update balance error:', error);
      showToast('Error updating balance', 'error');
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectPayment = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(filteredPayments.map(p => p._id)));
    }
  };

  const handleDeleteClick = (type: 'single' | 'bulk', id?: string) => {
    setDeleteTarget({ type, id });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      console.error('[Delete] No delete target set');
      return;
    }

    console.log('[Delete] Delete target:', deleteTarget);
    console.log('[Delete] Selected payments:', selectedPayments);

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');

      if (deleteTarget.type === 'single' && deleteTarget.id) {
        // Delete single payment
        const url = `/api/admin/payments/${deleteTarget.id}`;
        console.log('[Delete] Single delete - URL:', url);
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          showToast('Payment deleted successfully!', 'success');
          setSelectedPayments(new Set());
          if (onRefresh) onRefresh();
        } else {
          const data = await response.json();
          showToast(data.error || 'Failed to delete payment', 'error');
        }
      } else if (deleteTarget.type === 'bulk' && selectedPayments.size > 0) {
        // Delete multiple payments
        const url = '/api/admin/payments';
        const body = { paymentIds: Array.from(selectedPayments) };
        console.log('[Delete] Bulk delete - URL:', url, 'Body:', body);
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          showToast(`${data.deletedCount || selectedPayments.size} payment(s) deleted successfully!`, 'success');
          setSelectedPayments(new Set());
          if (onRefresh) onRefresh();
        } else {
          const data = await response.json();
          showToast(data.error || 'Failed to delete payments', 'error');
        }
      } else {
        console.error('[Delete] Invalid delete target state:', deleteTarget);
        showToast('Invalid delete operation', 'error');
      }
    } catch (error) {
      console.error('Delete payment error:', error);
      showToast('Error deleting payment(s)', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
              {payments.length > 0 && (
                <span className="bg-white/20 dark:bg-gray-700/20 px-2 py-0.5 rounded-full text-xs">
                  {payments.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'withdrawals'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ArrowUpRight className="w-5 h-5" />
              <span>Withdrawals</span>
              {withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length > 0 && (
                <span className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'balance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>User Balances</span>
            </div>
          </button>
        </div>
      </div>

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Management</h3>
            <button 
              onClick={onExportPayments}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Report
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by user name or payment ID..."
                  value={paymentSearchTerm}
                  onChange={(e) => setPaymentSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="binance_wallet">Binance Wallet</option>
              </select>
              
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="binance_wallet">Binance Wallet</option>
                <option value="promo_code">Promo Code</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPayments.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {selectedPayments.size} payment(s) selected
              </span>
              <button
                onClick={() => handleDeleteClick('bulk')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white w-12">
                    <input
                      type="checkbox"
                      checked={filteredPayments.length > 0 && selectedPayments.size === filteredPayments.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment._id)}
                        onChange={() => handleSelectPayment(payment._id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payment.user?.firstName || 'Unknown'} {payment.user?.lastName || ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{payment.user?.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900 dark:text-white">${payment.amount} {payment.currency}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{payment.paymentMethod}</span>
                      {payment.paymentScreenshotUrl && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs" title="Has screenshot">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Screenshot
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                          : payment.status === 'pending' 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openPaymentModal(payment)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payment.status === 'pending' && payment.paymentMethod === 'binance_wallet' && (
                          <button 
                            onClick={async () => {
                              const token = localStorage.getItem('token');
                              setConfirmingPaymentId(payment._id);
                              try {
                                const response = await fetch(buildApiUrl(`api/payments/admin/confirm`), {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    paymentId: payment._id
                                  })
                                });
                                if (response.ok) {
                                  showToast('Payment confirmed successfully!', 'success');
                                  if (onRefresh) onRefresh();
                                } else {
                                  showToast('Failed to confirm payment', 'error');
                                }
                              } catch (error) {
                                showToast('Error confirming payment', 'error');
                              } finally {
                                setConfirmingPaymentId(null);
                              }
                            }}
                            disabled={confirmingPaymentId === payment._id}
                            className={`p-2 rounded-lg transition-colors ${
                              confirmingPaymentId === payment._id
                                ? 'text-green-400 dark:text-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed opacity-70'
                                : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={confirmingPaymentId === payment._id ? 'Confirming...' : 'Confirm Payment'}
                          >
                            {confirmingPaymentId === payment._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {payment.status === 'pending' && payment.paymentMethod !== 'binance_wallet' && (
                          <button 
                            onClick={() => onPaymentStatusUpdate(payment._id, 'completed')}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'completed' && (
                          <button 
                            onClick={() => onPaymentStatusUpdate(payment._id, 'refunded')}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Refund"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteClick('single', payment._id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Withdrawal Requests</h3>
            <button
              onClick={() => onRefresh && onRefresh()}
              className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by user name, wallet address, or withdrawal ID..."
                  value={withdrawalSearchTerm}
                  onChange={(e) => setWithdrawalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <select
              value={withdrawalStatusFilter}
              onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedWithdrawals.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {selectedWithdrawals.size} withdrawal(s) selected
              </span>
              <button
                onClick={handleBulkDeleteWithdrawals}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white w-12">
                    <input
                      type="checkbox"
                      checked={filteredWithdrawals.length > 0 && selectedWithdrawals.size === filteredWithdrawals.length}
                      onChange={handleSelectAllWithdrawals}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Network</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Wallet Address</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedWithdrawals.has(withdrawal._id)}
                        onChange={() => handleSelectWithdrawal(withdrawal._id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {withdrawal.user?.firstName || 'Unknown'} {withdrawal.user?.lastName || ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{withdrawal.user?.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${withdrawal.amount.toFixed(2)} {withdrawal.currency}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                        {withdrawal.network}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-mono text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {withdrawal.walletAddress}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(withdrawal.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openWithdrawalModal(withdrawal)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWithdrawal(withdrawal._id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Withdrawal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Balances Tab */}
      {activeTab === 'balance' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">User Balance Management</h3>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={balanceSearchTerm}
                  onChange={(e) => setBalanceSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Current Balance</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${(user.balance || 0).toFixed(2)} USDT
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => openBalanceModal(user)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Balance"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Details</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedPayment._id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedPayment.status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : selectedPayment.status === 'pending' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User</label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPayment.user?.firstName || 'Unknown'} {selectedPayment.user?.lastName || ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedPayment.user?.email || 'No email'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                  <p className="text-gray-900 dark:text-white font-semibold">${selectedPayment.amount} {selectedPayment.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedPayment.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment submission details (name, email, screenshot) - shown for signup payments */}
              {(selectedPayment.payerName || selectedPayment.payerEmail || selectedPayment.paymentScreenshotUrl) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment submission details</label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    {(selectedPayment.payerName || selectedPayment.payerEmail) && (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedPayment.payerName && (
                          <p className="text-sm"><span className="font-medium text-gray-500 dark:text-gray-400">Payer name:</span><br /><span className="text-gray-900 dark:text-white">{selectedPayment.payerName}</span></p>
                        )}
                        {selectedPayment.payerEmail && (
                          <p className="text-sm"><span className="font-medium text-gray-500 dark:text-gray-400">Payer email:</span><br /><span className="text-gray-900 dark:text-white">{selectedPayment.payerEmail}</span></p>
                        )}
                      </div>
                    )}
                    {selectedPayment.paymentScreenshotUrl && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Payment screenshot</span>
                        <a href={selectedPayment.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                          <img src={selectedPayment.paymentScreenshotUrl} alt="Payment screenshot" className="max-h-56 w-auto object-contain block" />
                        </a>
                        <a href={selectedPayment.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 mt-2 inline-block hover:underline">Open full size in new tab</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPayment.paymentMethod === 'binance_wallet' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Binance Wallet Details</label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Network:</span> {selectedPayment.binanceWallet?.network || 'TRC20'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Wallet Address:</span> {selectedPayment.binanceWallet?.walletAddress || 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna'}
                    </p>
                    {(selectedPayment.binanceWallet?.transactionHash) && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">User Transaction ID/Hash</label>
                        <p className="text-sm font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 p-2 rounded break-all">
                          {selectedPayment.binanceWallet?.transactionHash}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          ✓ Verify this transaction ID in your wallet before confirming payment
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
                {selectedPayment.status === 'pending' && selectedPayment.paymentMethod === 'binance_wallet' && (
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      try {
                        const response = await fetch(buildApiUrl(`api/payments/admin/confirm`), {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            paymentId: selectedPayment._id,
                            transactionHash: ''
                          })
                        });
                        if (response.ok) {
                          showToast('Payment confirmed successfully!', 'success');
                          setShowPaymentModal(false);
                          if (onRefresh) onRefresh();
                        } else {
                          showToast('Failed to confirm payment', 'error');
                        }
                      } catch (error) {
                        showToast('Error confirming payment', 'error');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200"
                  >
                    Confirm Payment
                  </button>
                )}
                {selectedPayment.status === 'pending' && selectedPayment.paymentMethod !== 'binance_wallet' && (
                  <button
                    onClick={() => {
                      onPaymentStatusUpdate(selectedPayment._id, 'completed');
                      setShowPaymentModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Details Modal */}
      {showWithdrawalModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Withdrawal Details</h3>
              <button 
                onClick={() => setShowWithdrawalModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Withdrawal ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedWithdrawal._id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedWithdrawal.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                      {selectedWithdrawal.status.charAt(0).toUpperCase() + selectedWithdrawal.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User</label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedWithdrawal.user?.firstName || 'Unknown'} {selectedWithdrawal.user?.lastName || ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedWithdrawal.user?.email || 'No email'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    ${selectedWithdrawal.amount.toFixed(2)} {selectedWithdrawal.currency}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Network</label>
                  <p className="text-gray-900 dark:text-white font-mono">{selectedWithdrawal.network}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(selectedWithdrawal.createdAt)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wallet Address</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-all bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {selectedWithdrawal.walletAddress}
                </p>
              </div>

              {selectedWithdrawal.transactionHash && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Hash</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm break-all bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedWithdrawal.transactionHash}
                  </p>
                </div>
              )}

              {selectedWithdrawal.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">Rejection Reason</label>
                  <p className="text-sm text-red-800 dark:text-red-200">{selectedWithdrawal.rejectionReason}</p>
                </div>
              )}

              {(selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'processing') && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Hash (Optional)
                    </label>
                    <input
                      type="text"
                      value={withdrawalTransactionHash}
                      onChange={(e) => setWithdrawalTransactionHash(e.target.value)}
                      placeholder="Enter transaction hash if available"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={withdrawalNotes}
                      onChange={(e) => setWithdrawalNotes(e.target.value)}
                      placeholder="Add any notes about this withdrawal"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rejection Reason (Required for rejection)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason if rejecting this withdrawal (max 2000 characters)"
                      rows={4}
                      maxLength={2000}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rejectionReason.length}/2000 characters</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCompleteWithdrawal}
                      disabled={isProcessingWithdrawal}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingWithdrawal ? 'Processing...' : 'Complete Withdrawal'}
                    </button>
                    <button
                      onClick={handleRejectWithdrawal}
                      disabled={isProcessingWithdrawal || !rejectionReason.trim()}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject Withdrawal
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Edit Modal */}
      {showBalanceModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit User Balance</h3>
              <button 
                onClick={() => setShowBalanceModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Balance
                </label>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">
                  ${(selectedUser.balance || 0).toFixed(2)} USDT
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Balance (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="Enter new balance"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Reason for balance change"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    This action will permanently update the user's balance. Please ensure the amount is correct.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBalance}
                  disabled={isUpdatingBalance}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingBalance ? 'Updating...' : 'Update Balance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Deletion</h3>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      {deleteTarget.type === 'single' 
                        ? 'Are you sure you want to delete this payment?' 
                        : `Are you sure you want to delete ${selectedPayments.size} selected payment(s)?`}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This action cannot be undone. The payment(s) will be permanently removed from the system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
