'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Check, AlertCircle, ArrowLeft, Mail, Gift, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import { cartTotal, loadCart, saveCart, type CartItem } from '../../lib/shopCart';
import { getProductImageUrl } from '../../lib/publicProducts';

const BINANCE_WALLET_ADDRESS = 'TApaMK8BcN67GDRqVs45qnzbb4oQGt2Pna';
const NETWORK = 'TRC20';
const MIN_TRANSACTION_ID_LENGTH = 10;

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [originalAmount, setOriginalAmount] = useState(0);
  
  const packageName = searchParams?.get('package') || '';
  const productId = searchParams?.get('productId') || '';
  const productName = searchParams?.get('productName') || '';
  const amountParam = searchParams?.get('amount') || '0';
  const paymentIdFromUrl = searchParams?.get('paymentId') || searchParams?.get('paymentid') || '';
  const isMonthlyFeeFlow = searchParams?.get('type') === 'monthly_fee';
  const isProductFlow = searchParams?.get('type') === 'product';
  const isCartFlow = searchParams?.get('type') === 'cart';
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activePaymentId, setActivePaymentId] = useState(paymentIdFromUrl);

  const [loadedPayment, setLoadedPayment] = useState<{
    finalAmount?: number;
    amount?: number;
    type?: string;
    binanceWallet?: { walletAddress?: string; network?: string };
    paymentScreenshotUrl?: string;
    status?: string;
  } | null>(null);
  const [loadingPaymentDoc, setLoadingPaymentDoc] = useState(false);

  const parseAmountParam = useCallback((v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const displayAmount = (() => {
    if (isMonthlyFeeFlow && loadedPayment) {
      const n = Number(loadedPayment.finalAmount ?? loadedPayment.amount ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }
    if (isCartFlow && cartItems.length > 0) {
      return cartTotal(cartItems);
    }
    const fromParam = parseAmountParam(amountParam);
    const orig = originalAmount || fromParam;
    const discounted = orig - promoDiscount;
    return discounted > 0 ? discounted : fromParam;
  })();

  const walletAddressForQr =
    isMonthlyFeeFlow && loadedPayment?.binanceWallet?.walletAddress
      ? loadedPayment.binanceWallet.walletAddress
      : BINANCE_WALLET_ADDRESS;
  const qrValue = walletAddressForQr;

  useEffect(() => {
    if (isMonthlyFeeFlow && !activePaymentId) {
      router.replace('/monthly-fee');
    }
  }, [isMonthlyFeeFlow, activePaymentId, router]);

  useEffect(() => {
    if (isCartFlow) {
      const items = loadCart();
      setCartItems(items);
      if (items.length === 0) {
        router.replace('/shop/cart');
      } else {
        const total = cartTotal(items);
        if (total > 0) setOriginalAmount(total);
      }
    }
  }, [isCartFlow, router]);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      const redirect =
        typeof window !== 'undefined' && window.location.search
          ? `/payment${window.location.search}`
          : '/payment';
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (isMonthlyFeeFlow && activePaymentId) {
      setLoadingPaymentDoc(true);
      (async () => {
        try {
          setError('');
          const res = await fetch(buildApiUrl(`api/payments/${activePaymentId}`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError((data as { error?: string }).error || 'Could not load payment');
            setLoadingPaymentDoc(false);
            return;
          }
          const p = (data as { payment?: typeof loadedPayment }).payment;
          if (!p || p.type !== 'monthly_fee') {
            setError('Invalid monthly fee payment.');
            setLoadingPaymentDoc(false);
            return;
          }
          setLoadedPayment(p);
          setError('');
          const amt = Number(p.finalAmount ?? p.amount ?? 0);
          if (amt > 0) setOriginalAmount(amt);
          if (p.paymentScreenshotUrl) {
            setPaymentStatus('pending');
          }
        } catch {
          setError('Could not load payment');
        } finally {
          setLoadingPaymentDoc(false);
        }
      })();
    } else {
      const parsedAmount = parseFloat(amountParam);
      if (parsedAmount > 0 && originalAmount === 0) {
        setOriginalAmount(parsedAmount);
      }
    }

    // Pre-fill payer name and email from current user
    const prefillPayer = async () => {
      const t = localStorage.getItem('token');
      if (!t) return;
      try {
        const res = await fetch(buildApiUrl('api/auth/me'), { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) {
          const data = await res.json();
          const u = data.user || data;
          if (u.firstName || u.lastName) setPayerName([u.firstName, u.lastName].filter(Boolean).join(' ').trim());
          if (u.email) setPayerEmail(u.email);
        }
      } catch (_) {}
    };
    prefillPayer();

    // Check payment status periodically
    if (activePaymentId) {
      checkPaymentStatus();
      const interval = setInterval(checkPaymentStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activePaymentId, router, isMonthlyFeeFlow, amountParam]);

  const checkPaymentStatus = async () => {
    if (!activePaymentId) return;

    setIsCheckingPayment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/payments/${activePaymentId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const payment = data.payment;
        // Only redirect if payment is completed AND has a transaction ID (user submitted hash and admin verified)
        if (payment?.status === 'completed' && payment?.transactionId) {
          setPaymentStatus('completed');
          setTimeout(() => {
            router.push(isProductFlow || isCartFlow ? '/shop/my-purchases' : '/dashboard');
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
    if (isMonthlyFeeFlow || isProductFlow || isCartFlow) return;
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
        
        // Update payment with promo code if paymentId exists (requires an existing payment record)
        if (activePaymentId) {
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
    if (!activePaymentId) return;

    try {
      const token = localStorage.getItem('token');
      // Update payment via the create endpoint with promo code
      const response = await fetch(buildApiUrl(`api/payments/${activePaymentId}`), {
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
        const newUrl = `/payment?package=${encodeURIComponent(packageName)}&amount=${newAmount}&paymentId=${activePaymentId}`;
        router.replace(newUrl);
      } else {
        console.error('Failed to update payment with promo code');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
    }
  };

  const handlePaymentSent = async () => {
    const trimmed = transactionId.trim();
    if (!trimmed) {
      setError('Please enter your transaction ID / hash from your wallet.');
      return;
    }
    if (trimmed.length < MIN_TRANSACTION_ID_LENGTH) {
      setError('Transaction ID is too short. Copy the full hash from your wallet.');
      return;
    }
    if (!payerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!payerEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!screenshotFile) {
      setError('Please upload a screenshot of your payment.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('transactionId', trimmed);
      formData.append('payerName', payerName.trim());
      formData.append('payerEmail', payerEmail.trim());
      formData.append('screenshot', screenshotFile);
      if (!isMonthlyFeeFlow && !isProductFlow) {
        formData.append('packageName', packageName);
        formData.append('amount', String(displayAmount));
      }
      if (isProductFlow) {
        formData.append('productId', productId);
        formData.append('amount', String(displayAmount));
      }
      if (isCartFlow) {
        formData.append(
          'items',
          JSON.stringify(cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })))
        );
        formData.append('amount', String(displayAmount));
      }

      const submitUrl = activePaymentId
        ? `api/payments/${activePaymentId}/submit-payment`
        : isCartFlow
          ? 'api/payments/submit-product-cart'
          : isProductFlow
            ? 'api/payments/submit-product'
            : 'api/payments/submit-package';

      const response = await fetch(buildApiUrl(submitUrl), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const raw = await response.text();
      let data: Record<string, unknown> = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          throw new Error('Server returned an invalid response. If you are on localhost, restart the dev server and try again.');
        }
      } else if (!response.ok) {
        throw new Error(`Request failed (${response.status}). Please try again.`);
      }

      if (!response.ok) {
        const errors = data.errors as Array<{ msg?: string }> | undefined;
        const msg =
          (errors && errors[0]?.msg) ||
          (data.error as string) ||
          (data.message as string) ||
          'Failed to submit payment';
        throw new Error(msg);
      }

      const paymentObj = (data.payment as { _id?: string } | undefined) || undefined;
      if (paymentObj?._id) {
        setActivePaymentId(paymentObj._id);
        if (!paymentIdFromUrl) {
          const base = isCartFlow
            ? `/payment?type=cart&amount=${displayAmount}&paymentId=${paymentObj._id}`
            : isProductFlow
              ? `/payment?type=product&productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName)}&amount=${displayAmount}&paymentId=${paymentObj._id}`
              : `/payment?package=${encodeURIComponent(packageName)}&amount=${displayAmount}&paymentId=${paymentObj._id}`;
          router.replace(base);
        }
      }

      if (isCartFlow) {
        saveCart([]);
        setCartItems([]);
      }

      setPaymentStatus('pending');
      setTransactionId('');
      setPayerName('');
      setPayerEmail('');
      setScreenshotFile(null);
      setScreenshotPreview(null);

      setTimeout(() => {
        const q = isMonthlyFeeFlow
          ? `from=monthly-fee&amount=${displayAmount}`
          : isCartFlow
            ? `type=cart&amount=${displayAmount}`
            : isProductFlow
              ? `type=product&productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName)}&amount=${displayAmount}`
              : `package=${encodeURIComponent(packageName)}&amount=${displayAmount}`;
        router.push(`/payment-pending?${q}`);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit payment. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPEG, PNG, GIF, or WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be under 5MB.');
        return;
      }
      setScreenshotFile(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setError('');
    } else {
      setScreenshotFile(null);
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
  };

  if (isMonthlyFeeFlow && !activePaymentId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Returning to monthly fee…</p>
      </div>
    );
  }

  if (isMonthlyFeeFlow && activePaymentId && loadingPaymentDoc) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-600 dark:text-gray-300 text-sm">Loading payment…</div>
      </div>
    );
  }

  if (isMonthlyFeeFlow && activePaymentId && !loadingPaymentDoc && !loadedPayment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Payment could not be opened</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This payment link is invalid or you do not have access.'}
          </p>
          <Link
            href="/monthly-fee"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to monthly fee
          </Link>
        </div>
      </div>
    );
  }

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
      <div className="w-full max-w-2xl overflow-x-hidden">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link 
            href={isMonthlyFeeFlow ? '/monthly-fee' : isCartFlow ? '/shop/cart' : isProductFlow ? `/shop/${productId}` : '/select-package'}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        {/* Payment Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {isMonthlyFeeFlow ? 'Monthly fee payment' : isCartFlow ? 'Complete cart checkout' : isProductFlow ? 'Complete product purchase' : 'Complete Payment'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {isMonthlyFeeFlow
                ? 'Send USDT using the same steps as your signup payment. After admin confirms, your access is restored.'
                : isCartFlow || isProductFlow
                  ? 'Send USDT to purchase your items. Access is unlocked after admin confirms your payment.'
                  : 'Send USDT to the address below to activate your account'}
            </p>
          </div>

          {/* Cart items */}
          {isCartFlow && cartItems.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">Cart ({cartItems.reduce((n, i) => n + i.quantity, 0)} items)</p>
              <ul className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3">
                    {item.primaryImage ? (
                      <img
                        src={getProductImageUrl(item.primaryImage)}
                        alt=""
                        className="h-12 w-12 rounded object-cover bg-white"
                      />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center pt-3 border-t border-indigo-200 dark:border-indigo-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">${displayAmount.toFixed(2)} USDT</span>
              </div>
            </div>
          )}

          {/* Product Info */}
          {isProductFlow && productName && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-1">Product</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{productName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-1">Amount</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    ${(originalAmount || parseFloat(amountParam)).toFixed(2)} USDT
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Package Info (signup flow only) */}
          {!isMonthlyFeeFlow && !isProductFlow && !isCartFlow && packageName && (
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

          {isMonthlyFeeFlow && loadedPayment && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6 border border-amber-200 dark:border-amber-800">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-1">Payment type</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">Monthly fee</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-1">Amount</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    ${Number(loadedPayment.finalAmount ?? loadedPayment.amount ?? 0).toFixed(2)} USDT
                  </p>
                </div>
              </div>
            </div>
          )}

          {isMonthlyFeeFlow && (
            <div className="mb-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-4 py-3">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Step 1 — Send USDT</p>
              <p className="text-xs text-violet-800/90 dark:text-violet-200/90 mt-1">
                Scan the QR code or copy the wallet address below. Use the <strong>TRC20</strong> network only and send
                exactly <strong>${displayAmount.toFixed(2)} USDT</strong> for this monthly fee.
              </p>
            </div>
          )}

          {/* QR Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Wallet address
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 flex min-w-0 items-center justify-between gap-3 border border-gray-200 dark:border-gray-600">
              <code className="min-w-0 flex-1 text-sm text-gray-900 dark:text-white font-mono break-all">
                {walletAddressForQr}
              </code>
              <button
                onClick={() => copyToClipboard(walletAddressForQr)}
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
              Network:{' '}
              <span className="font-medium">
                {isMonthlyFeeFlow && loadedPayment?.binanceWallet?.network
                  ? loadedPayment.binanceWallet.network
                  : NETWORK}
              </span>
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
                  <li>
                    •{' '}
                    {isMonthlyFeeFlow
                      ? 'After you submit hash + screenshot below, an admin verifies your payment and restores your access.'
                      : 'Your account will be activated after admin verification'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {isMonthlyFeeFlow && (
            <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Step 2 — Submit proof for admin</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Enter your transaction hash from the wallet, your name and email, upload a clear screenshot of the
                transfer, then press submit. Admins are notified automatically to verify your monthly fee.
              </p>
            </div>
          )}

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
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              After completing the transfer, copy your Transaction ID from your wallet and paste it here.
            </p>
          </div>

          {/* Payer Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => { setPayerName(e.target.value); setError(''); }}
              placeholder="Full name"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={paymentStatus === 'pending' || isSubmitting}
            />
          </div>

          {/* Payer Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={payerEmail}
              onChange={(e) => { setPayerEmail(e.target.value); setError(''); }}
              placeholder="Email address"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={paymentStatus === 'pending' || isSubmitting}
            />
          </div>

          {/* Payment screenshot upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment screenshot <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/50 transition-colors">
                <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {screenshotFile ? screenshotFile.name : 'Choose image (JPEG, PNG, GIF, WebP — max 5MB)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleScreenshotChange}
                  disabled={paymentStatus === 'pending' || isSubmitting}
                />
              </label>
              {screenshotPreview && (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 max-h-40">
                  <img src={screenshotPreview} alt="Preview" className="w-full h-auto object-contain max-h-40" />
                  <button
                    type="button"
                    onClick={() => { setScreenshotFile(null); if (screenshotPreview) URL.revokeObjectURL(screenshotPreview); setScreenshotPreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 text-xs"
                    aria-label="Remove screenshot"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Upload a screenshot of your payment from your wallet for verification.
            </p>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Actions */}
          <button
            onClick={handlePaymentSent}
            disabled={isSubmitting || paymentStatus === 'pending' || !transactionId.trim() || transactionId.trim().length < MIN_TRANSACTION_ID_LENGTH || !payerName.trim() || !payerEmail.trim() || !screenshotFile}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting…' : isMonthlyFeeFlow ? 'Submit to admin for verification' : 'Submit Payment'}
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
