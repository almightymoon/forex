'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CreditCard, Package, Receipt } from 'lucide-react';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import ReceiptActions from '../../components/ReceiptActions';

type JoinReceipt = {
  kind: 'join';
  title: string;
  issuedAt: string;
  receiptNumber: string;
  packageName?: string | null;
};

type PaymentReceipt = {
  id: string;
  kind: string;
  title: string;
  amount: number;
  currency: string;
  issuedAt: string;
  receiptNumber: string;
  transactionId?: string | null;
  feeForMonthLabel?: string | null;
  paymentMethod?: string;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)}`;
  }
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [join, setJoin] = useState<JoinReceipt | null>(null);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?redirect=/receipts');
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('api/payments/receipts'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setError(json.error || 'Failed to load receipts');
          return;
        }
        setJoin(json.join || null);
        setPayments(Array.isArray(json.payments) ? json.payments : []);
      } catch {
        if (alive) setError('Failed to load receipts');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const packageReceipts = useMemo(() => payments.filter((p) => p.kind === 'package'), [payments]);
  const monthlyReceipts = useMemo(() => payments.filter((p) => p.kind === 'monthly_fee'), [payments]);
  const otherReceipts = useMemo(
    () => payments.filter((p) => p.kind !== 'package' && p.kind !== 'monthly_fee'),
    [payments]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <CoolLoader message="Loading receipts..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>
          <DarkModeToggle size="sm" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-8 h-8 text-violet-600" />
            Receipts
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Download your join, package, monthly-fee, and other payment receipts as PDF.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {join ? (
          <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Membership
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{join.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Joined {formatDate(join.issuedAt)}
                  {join.packageName ? ` · ${join.packageName}` : ''}
                </p>
                <p className="text-xs font-mono text-gray-500 mt-1">{join.receiptNumber}</p>
              </div>
              <ReceiptActions
                endpoint="api/payments/receipts/join"
                filename={`Forex-Navigators-${join.receiptNumber}.pdf`}
                label="Download"
                previewTitle="Membership receipt"
              />
            </div>
          </section>
        ) : null}

        <ReceiptGroup
          title="Package"
          icon={<Package className="w-4 h-4 text-blue-500" />}
          empty="No completed package payment yet."
          items={packageReceipts}
        />
        <ReceiptGroup
          title="Monthly fee"
          icon={<CreditCard className="w-4 h-4 text-amber-500" />}
          empty="No completed monthly-fee payments yet."
          items={monthlyReceipts}
        />
        <ReceiptGroup
          title="Other payments"
          icon={<Receipt className="w-4 h-4 text-slate-500" />}
          empty="No other completed payments."
          items={otherReceipts}
          hideIfEmpty
        />
      </div>
    </div>
  );
}

function ReceiptGroup({
  title,
  icon,
  empty,
  items,
  hideIfEmpty
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  items: PaymentReceipt[];
  hideIfEmpty?: boolean;
}) {
  if (hideIfEmpty && items.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((row) => (
            <div key={row.id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{row.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatDate(row.issuedAt)} · {formatMoney(row.amount, row.currency)}
                  {row.paymentMethod ? ` · ${row.paymentMethod}` : ''}
                </p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{row.receiptNumber}</p>
              </div>
              <ReceiptActions
                endpoint={`api/payments/${row.id}/receipt`}
                filename={`Forex-Navigators-${row.receiptNumber}.pdf`}
                iconOnly
                title="receipt"
                previewTitle={row.title}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
