'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    description: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
  };
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentData,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'error'>('select');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setError('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    setIsProcessing(true);
    setStep('processing');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...paymentData,
          type: 'signup'
        })
      });

      const result = await response.json();

      if (result.success) {
        if (paymentData.paymentMethod === 'stripe' || paymentData.paymentMethod === 'credit_card') {
          // Handle Stripe payment
          setStep('success');
          setTimeout(() => {
            onPaymentSuccess(result.data);
            onClose();
          }, 2000);
        } else if (paymentData.paymentMethod === 'easypaisa') {
          // Redirect to EasyPaisa
          window.location.href = result.data.redirectUrl;
        } else if (paymentData.paymentMethod === 'jazz_cash') {
          // Redirect to JazzCash
          window.location.href = result.data.redirectUrl;
        }
      } else {
        setError(result.error || 'Payment processing failed');
        setStep('error');
      }
    } catch (err) {
      setError('Payment processing failed. Please try again.');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="w-6 h-6" />;
      case 'easypaisa':
      case 'jazz_cash':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'stripe':
      case 'credit_card':
        return 'Credit/Debit Card';
      case 'easypaisa':
        return 'EasyPaisa';
      case 'jazz_cash':
        return 'JazzCash';
      default:
        return 'Payment';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Complete Payment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Payment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Description:</span>
                    <span className="text-gray-900 dark:text-white">{paymentData.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {paymentData.currency === 'USD' ? '$' : '₨'}{paymentData.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Method:</span>
                    <span className="text-gray-900 dark:text-white">{getMethodName(paymentData.paymentMethod)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Display */}
              <div className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 mr-3">
                  {getMethodIcon(paymentData.paymentMethod)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {getMethodName(paymentData.paymentMethod)}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {paymentData.customerEmail}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pay Now
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Processing Payment...
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we process your payment
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Your payment has been processed successfully
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Payment Failed
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;








