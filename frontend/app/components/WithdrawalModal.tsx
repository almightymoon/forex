'use client';

import { useEffect, useState } from 'react';
import { X, Wallet, ArrowUpRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildApiUrl } from '../../utils/api';
import { showToast } from '../../utils/toast';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onSuccess?: () => void;
}

export default function WithdrawalModal({
  isOpen,
  onClose,
  userBalance,
  onSuccess
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState<number | null>(null);

  if (!isOpen) return null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(buildApiUrl('api/withdrawals/min'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          const v = Number(data?.minWithdrawalAmount);
          if (Number.isFinite(v)) setMinWithdrawal(v);
        }
      } catch {
        // ignore; backend validation will still enforce
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const withdrawalAmount = parseFloat(amount);
    
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (typeof minWithdrawal === 'number' && withdrawalAmount < minWithdrawal) {
      showToast(`Minimum withdrawal amount is $${minWithdrawal.toFixed(2)}`, 'error');
      return;
    }

    if (withdrawalAmount > userBalance) {
      showToast('Insufficient balance', 'error');
      return;
    }

    if (!walletAddress.trim()) {
      showToast('Please enter wallet address', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl('api/withdrawals/request'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          walletAddress: walletAddress.trim(),
          network
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Withdrawal request submitted successfully!', 'success');
        setAmount('');
        setWalletAddress('');
        setNetwork('TRC20');
        onClose();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('platform:userChanged'));
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showToast(data.message || 'Failed to submit withdrawal request', 'error');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showToast('Error submitting withdrawal request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Request Withdrawal
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Available: ${userBalance.toFixed(2)} USDT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Balance Warning */}
          {userBalance <= 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your account balance is $0.00 USDT. You need to have a balance to make a withdrawal request.
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={userBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max: $${userBalance.toFixed(2)}`}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={userBalance <= 0}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum withdrawal: ${userBalance.toFixed(2)} USDT
            </p>
            {typeof minWithdrawal === 'number' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum withdrawal: ${minWithdrawal.toFixed(2)} USDT
              </p>
            )}
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your USDT wallet address"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              required
              disabled={userBalance <= 0}
            />
          </div>

          {/* Network */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium">
              TRC20 (Tron) — only supported network
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Withdrawals are processed on TRC20 only. Do not use ERC20 or BEP20 addresses.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Admin will process your withdrawal request. You will be notified once it's completed.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || userBalance <= 0}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
