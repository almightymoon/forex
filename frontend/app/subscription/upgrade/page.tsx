'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, AlertCircle, Upload, Mail } from 'lucide-react';
import DarkModeToggle from '../../../components/DarkModeToggle';
import { buildApiUrl } from '@/utils/api';

type UpgradeOptionsResponse =
  | {
      hasUpgrade: true;
      current: { name: string; price: number; sortOrder?: number };
      next: { name: string; price: number; sortOrder?: number };
      upgradePrice: number;
      targets?: Array<{ name: string; price: number; sortOrder?: number; upgradePrice: number }>;
    }
  | { hasUpgrade: false; reason?: string; current?: { name: string; price: number; sortOrder?: number } };

const MIN_TRANSACTION_ID_LENGTH = 10;

export default function SubscriptionUpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<UpgradeOptionsResponse | null>(null);
  const [error, setError] = useState('');

  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/subscription/upgrade');
      return;
    }

    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(buildApiUrl('api/packages/upgrade-options'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = (await res.json().catch(() => ({}))) as UpgradeOptionsResponse;
        if (!res.ok) {
          setError((json as any)?.error || 'Failed to load upgrade options');
          setOptions(null);
          return;
        }
        setOptions(json);
      } catch (e) {
        setError('Failed to load upgrade options');
        setOptions(null);
      } finally {
        setLoading(false);
      }
    })();

    // Pre-fill payer name and email from current user
    (async () => {
      try {
        const res = await fetch(buildApiUrl('api/auth/me'), { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const u = (data as any).user || data;
          if (u.firstName || u.lastName) setPayerName([u.firstName, u.lastName].filter(Boolean).join(' ').trim());
          if (u.email) setPayerEmail(u.email);
        }
      } catch (_) {}
    })();
  }, [router]);

  const upgradeSummary = useMemo(() => {
    if (!options || (options as any).hasUpgrade !== true) return null;
    const o = options as Extract<UpgradeOptionsResponse, { hasUpgrade: true }>;
    const targets = Array.isArray(o.targets) ? o.targets : [];
    const pick =
      (selectedTarget ? targets.find((t) => t.name === selectedTarget) : null) ||
      targets[0] ||
      { name: o.next.name, price: o.next.price, upgradePrice: o.upgradePrice };
    return {
      fromName: o.current.name,
      toName: pick.name,
      fromPrice: Number(o.current.price || 0),
      toPrice: Number(pick.price || 0),
      upgradePrice: Number(pick.upgradePrice || 0),
      targets
    };
  }, [options, selectedTarget]);

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

  const canSubmit =
    !isSubmitting &&
    !submitted &&
    !!upgradeSummary &&
    transactionId.trim().length >= MIN_TRANSACTION_ID_LENGTH &&
    payerName.trim().length > 0 &&
    payerEmail.trim().length > 0 &&
    !!screenshotFile;

  const submitUpgrade = async () => {
    if (!upgradeSummary) return;

    const trimmed = transactionId.trim();
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
      if (!token) throw new Error('Please login again.');

      const formData = new FormData();
      formData.append('transactionId', trimmed);
      formData.append('payerName', payerName.trim());
      formData.append('payerEmail', payerEmail.trim());
      formData.append('screenshot', screenshotFile);
      formData.append('targetPackageName', upgradeSummary.toName);

      const res = await fetch(buildApiUrl('api/payments/submit-package-upgrade'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const raw = await res.text();
      let data: any = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('Server returned an invalid response. Please try again.');
        }
      }

      if (!res.ok) {
        const msg =
          (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
          data?.error ||
          data?.message ||
          'Failed to submit upgrade payment';
        throw new Error(String(msg));
      }

      setSubmitted(true);
      setTimeout(() => {
        router.push(`/payment-pending?package=${encodeURIComponent(upgradeSummary.toName)}&amount=${upgradeSummary.upgradePrice}`);
      }, 1200);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit upgrade payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl overflow-x-hidden">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/subscription"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-5 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Upgrade Package</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Pay the full price of the selected package. After admin confirmation, your new perks will be active.
            </p>
          </div>

          {loading && (
            <div className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">Loading upgrade options…</div>
          )}

          {!loading && (error || !options) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">Could not load upgrade</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error || 'Please try again.'}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && options && (options as any).hasUpgrade !== true && (
            <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">No upgrade available</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                You’re either already on the top tier, or you don’t have an active package yet.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/select-package')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  View packages
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Go to dashboard
                </button>
              </div>
            </div>
          )}

          {!loading && upgradeSummary && (
            <>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current package</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{upgradeSummary.fromName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">${upgradeSummary.fromPrice.toFixed(2)} USDT</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next package</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">{upgradeSummary.toName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">${upgradeSummary.toPrice.toFixed(2)} USDT</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Amount to pay</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${upgradeSummary.upgradePrice.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {upgradeSummary.targets.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Select a package to upgrade to</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {upgradeSummary.targets.map((t) => {
                      const active = t.name === upgradeSummary.toName;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setSelectedTarget(t.name)}
                          className={`text-left rounded-xl border p-4 transition-colors ${
                            active
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">${Number(t.price || 0).toFixed(2)} USDT</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Amount to pay</p>
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                ${Number(t.upgradePrice || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Important</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Use <strong>TRC20</strong> network only</li>
                      <li>
                        • Send exactly <strong>${upgradeSummary.upgradePrice.toFixed(2)} USDT</strong> (full package price)
                      </li>
                      <li>• Submit transaction hash + screenshot below for admin verification</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Transaction ID */}
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
                  disabled={isSubmitting || submitted}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Copy the full hash from your wallet (min {MIN_TRANSACTION_ID_LENGTH} characters).
                </p>
              </div>

              {/* Payer name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => {
                    setPayerName(e.target.value);
                    setError('');
                  }}
                  placeholder="Full name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isSubmitting || submitted}
                />
              </div>

              {/* Payer email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(e) => {
                    setPayerEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Email address"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isSubmitting || submitted}
                />
              </div>

              {/* Screenshot */}
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
                      disabled={isSubmitting || submitted}
                    />
                  </label>
                  {screenshotPreview && (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 max-h-40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotPreview} alt="Preview" className="w-full h-auto object-contain max-h-40" />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotFile(null);
                          if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
                          setScreenshotPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 text-xs"
                        aria-label="Remove screenshot"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                onClick={submitUpgrade}
                disabled={!canSubmit}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting…' : 'Submit upgrade payment'}
              </button>

              {submitted && (
                <div className="mt-4 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Wait for Admin Approval</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      You will receive an email notification once your upgrade is verified.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-800/80 dark:text-blue-200/80">
                      <Check className="w-4 h-4" />
                      Submitted
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

