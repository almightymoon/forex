'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import MonthlyFeeHistoryPanel from './MonthlyFeeHistoryPanel';

interface Props {
  userId: string;
  userLabel: string;
  onClose: () => void;
  onConfirmed?: () => void;
}

export default function MonthlyFeeHistoryModal({ userId, userLabel, onClose, onConfirmed }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly fee history</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{userLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              &quot;Fee for month&quot; is the UTC calendar month each payment counts toward (same rule as platform access).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          <MonthlyFeeHistoryPanel userId={userId} onConfirmed={onConfirmed} showRefreshButton />
        </div>
      </motion.div>
    </div>
  );
}
