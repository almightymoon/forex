'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Check, AlertCircle, ArrowLeft, Mail, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';

const BINANCE_WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';
const NETWORK = 'TRC20';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [originalAmount, setOriginalAmount] = useState(0);
  
  const packageName = searchParams?.get('package') || '';
  const amountParam = searchParams?.get('amount') || '0';
  const paymentId = searchParams?.get('paymentId') || '';
  
  // Calculate final amount (original - discount)
  const finalAmount = (originalAmount || parseFloat(amountParam)) - promoDiscount;
  const displayAmount = finalAmount > 0 ? finalAmount : parseFloat(amountParam);

  // Generate QR code data - format: wallet address
  const qrValue = BINANCE_WALLET_ADDRESS;

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/payment');
      return;
    }

    // Store original amount
    const parsedAmount = parseFloat(amountParam);
    if (parsedAmount > 0 && originalAmount === 0) {
      setOriginalAmount(parsedAmount);
    }

    // Check payment status periodically
    if (paymentId) {
      checkPaymentStatus();
      const interval = setInterval(checkPaymentStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [paymentId, router]);

  const checkPaymentStatus = async () => {
    if (!paymentId) return;

    setIsCheckingPayment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/payments/${paymentId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.payment?.status === 'completed') {
          setPaymentStatus('completed');
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !packageName || originalAmount === 0) return;

    setIsValidatingPromo(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('api/promos/validate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: promoCode,
          orderAmount: originalAmount,
          orderType: 'signup'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsPromoValid(true);
        setPromoDiscount(data.promo.discount || 0);
        setError('');
        
        // Update payment with promo code if paymentId exists
        if (paymentId) {
          await updatePaymentWithPromoCode(promoCode, data.promo.discount || 0);
        }
      } else {
        setIsPromoValid(false);
        setPromoDiscount(0);
        setError(data.message || 'Invalid promo code');
      }
    } catch (err) {
      setError('Error validating promo code');
      setIsPromoValid(false);
      setPromoDiscount(0);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const updatePaymentWithPromoCode = async (code: string, discount: number) => {
    if (!paymentId) return;

    try {
      const token = localStorage.getItem('token');
      // Update payment via the create endpoint with promo code
      const response = await fetch(buildApiUrl(`api/payments/${paymentId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          promoCode: code,
          discount: discount
        }),
      });

      if (response.ok) {
        // Update the amount in URL params for display
        const newAmount = originalAmount - discount;
        const newUrl = `/payment?package=${encodeURIComponent(packageName)}&amount=${newAmount}&paymentId=${paymentId}`;
        router.replace(newUrl);
      } else {
        console.error('Failed to update payment with promo code');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
    }
  };

  const handlePaymentSent = async () => {
    if (!transactionId.trim()) {
      setError('Please enter your transaction ID');
      return;
    }

    if (!paymentId) {
      setError('Payment ID is missing');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/payments/${paymentId}/transaction`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId: transactionId.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit transaction ID');
      }

      setPaymentStatus('pending');
      setTransactionId(''); // Clear the input after successful submission
      
      // Redirect to pending page after a brief delay
      setTimeout(() => {
        router.push(`/payment-pending?package=${encodeURIComponent(packageName)}&amount=${displayAmount}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting transaction ID:', err);
      setError(err.message || 'Failed to submit transaction ID. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Payment Confirmed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Your payment has been confirmed. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link 
            href="/select-package"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        {/* Payment Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Complete Payment
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Send USDT to the address below to activate your account
            </p>
          </div>

          {/* Package Info */}
          {packageName && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Package</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{packageName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">${(originalAmount || parseFloat(amountParam)).toFixed(2)} USDT</p>
                </div>
              </div>
              
              {/* Promo Code Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Have a Promo Code? (Optional)
                  </h3>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setIsPromoValid(false);
                        setPromoDiscount(0);
                        setError('');
                      }}
                      placeholder="Enter promo code"
                      className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                      disabled={isValidatingPromo}
                    />
                    {promoCode && !isPromoValid && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <Sparkles className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={validatePromoCode}
                    disabled={isValidatingPromo || !promoCode.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isValidatingPromo ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
                {isPromoValid && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      Promo code applied! You save ${promoDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Original Price:</span>
                      <span className="text-gray-900 dark:text-white font-medium">${originalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">-${promoDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-base font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${(originalAmount - promoDiscount).toFixed(2)} USDT</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Wallet Address
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 flex items-center justify-between border border-gray-200 dark:border-gray-600">
              <code className="text-sm text-gray-900 dark:text-white font-mono break-all flex-1 mr-3">
                {BINANCE_WALLET_ADDRESS}
              </code>
              <button
                onClick={() => copyToClipboard(BINANCE_WALLET_ADDRESS)}
                className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex justify-center">
              <div className="bg-white dark:bg-white p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Network: <span className="font-medium">Tron (TRC20)</span>
            </p>
          </div>

          {/* Important Note */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Important</p>
                <ul className="space-y-1 text-xs">
                  <li>• Use <strong>TRC20</strong> network only</li>
                  <li>• Send exactly <strong>${displayAmount.toFixed(2)} USDT</strong></li>
                  <li>• Your account will be activated after admin verification</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Transaction ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction ID / Hash <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => {
                setTransactionId(e.target.value);
                setError('');
              }}
              placeholder="Enter transaction ID from your wallet"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={paymentStatus === 'pending' || isSubmitting}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              After completing the transfer, copy your Transaction ID from your wallet and paste it here.
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={handlePaymentSent}
            disabled={isSubmitting || paymentStatus === 'pending' || !transactionId.trim()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Transaction ID'}
          </button>

          {/* Status Message */}
          {paymentStatus === 'pending' && (
            <div className="mt-4 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Wait for Admin Approval
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You will receive an email notification once your payment is verified
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
