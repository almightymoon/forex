'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { buildApiUrl } from '@/utils/api';
import ReceiptDownloadButton from '../../../components/ReceiptDownloadButton';

const PaymentSuccessPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');

  useEffect(() => {
    const id = searchParams.get('transactionId') || searchParams.get('paymentId') || '';
    if (id) {
      setTransactionId(id);
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('api/payments/user'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const payments = await res.json();
        const match = Array.isArray(payments)
          ? payments.find((p: { _id?: string; transactionId?: string; status?: string }) => {
              if (p.status !== 'completed') return false;
              if (!id) return false;
              return String(p.transactionId) === id || String(p._id) === id;
            })
          : null;
        if (alive && match?._id) {
          setPaymentId(String(match._id));
          if (match.transactionId) setTransactionId(String(match.transactionId));
        }
      } catch {
        // ignore — download still works from /receipts
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your payment has been processed successfully. A PDF receipt is ready to download.
          </p>
          {transactionId && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Transaction ID: {transactionId}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Method
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                Processed
              </span>
            </div>

            {paymentId ? (
              <ReceiptDownloadButton
                endpoint={`api/payments/${paymentId}/receipt`}
                filename="Forex-Navigators-receipt.pdf"
                label="Download receipt"
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              />
            ) : (
              <Link
                href="/receipts"
                className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                View receipts
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
          
          <Link
            href="/courses"
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Browse Courses
          </Link>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            A confirmation email with your receipt has been sent to your registered email address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
