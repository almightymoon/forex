'use client';

import { Mail, ArrowLeft } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function PaymentPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Top Bar with Back Button and Dark Mode Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Login</span>
          </button>
          <DarkModeToggle size="sm" />
            </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          {/* Mail Icon */}
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>

          {/* Two Lines of Text */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Wait for Admin Approval
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            You will receive an email notification once your payment is verified and your account is activated
                </p>
              </div>
      </div>
    </div>
  );
}
