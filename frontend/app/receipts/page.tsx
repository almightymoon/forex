'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { buildApiUrl } from '@/utils/api';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import ReceiptActions from '../../components/ReceiptActions';
import './receipts.css';

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
  return d.toLocaleDateString(undefined, { dateStyle: 'long' });
}

function formatMoney(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)}`;
  }
}

const btnView = 'rcp-btn rcp-btn--view';
const btnDownload = 'rcp-btn rcp-btn--download';
const btnIcon = 'rcp-btn rcp-btn--icon';

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
          headers: { Authorization: `Bearer ${token}` },
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
    [payments],
  );

  const totalCount = payments.length + (join ? 1 : 0);

  if (loading) {
    return <CoolLoader message="Loading receipts…" />;
  }

  return (
    <div className="receipts-page">
      <header className="receipts-page__header">
        <div className="receipts-page__header-inner">
          <Link href="/dashboard" className="receipts-page__back">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <DarkModeToggle size="sm" />
        </div>
      </header>

      <main className="receipts-page__main">
        <motion.div
          className="receipts-hero"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="receipts-hero__label">Billing</p>
          <h1 className="receipts-hero__title">Receipts</h1>
          <p className="receipts-hero__desc">
            Official payment records for your membership, packages, and monthly fees. Each document is available as a PDF.
          </p>
          <div className="receipts-stats">
            <div>
              <p className="receipts-stat__value">{totalCount}</p>
              <p className="receipts-stat__label">Documents</p>
            </div>
            <div>
              <p className="receipts-stat__value">{payments.length}</p>
              <p className="receipts-stat__label">Payments</p>
            </div>
          </div>
        </motion.div>

        {error ? <div className="receipts-alert">{error}</div> : null}

        {join ? (
          <ReceiptSection title="Membership" count={1} delay={0.05}>
            <ReceiptDoc
              variant="join"
              typeLabel="Registration"
              title={join.title}
              meta={`Joined ${formatDate(join.issuedAt)}${join.packageName ? ` · ${join.packageName}` : ''}`}
              receiptNumber={join.receiptNumber}
              amount={0}
              currency="USD"
              status="Registered"
              endpoint="api/payments/receipts/join"
              filename={`Forex-Navigators-${join.receiptNumber}.pdf`}
              previewTitle="Membership receipt"
              showAmount={false}
            />
          </ReceiptSection>
        ) : null}

        <ReceiptSection title="Package" count={packageReceipts.length} delay={0.08}>
          {packageReceipts.length === 0 ? (
            <p className="receipts-empty">No completed package payments.</p>
          ) : (
            packageReceipts.map((row) => (
              <ReceiptDoc
                key={row.id}
                variant="package"
                typeLabel="Package"
                title={row.title}
                meta={`${formatDate(row.issuedAt)}${row.paymentMethod ? ` · ${row.paymentMethod}` : ''}`}
                receiptNumber={row.receiptNumber}
                amount={row.amount}
                currency={row.currency}
                endpoint={`api/payments/${row.id}/receipt`}
                filename={`Forex-Navigators-${row.receiptNumber}.pdf`}
                previewTitle={row.title}
              />
            ))
          )}
        </ReceiptSection>

        <ReceiptSection title="Monthly fee" count={monthlyReceipts.length} delay={0.1}>
          {monthlyReceipts.length === 0 ? (
            <p className="receipts-empty">No completed monthly-fee payments.</p>
          ) : (
            monthlyReceipts.map((row) => (
              <ReceiptDoc
                key={row.id}
                variant="monthly"
                typeLabel="Monthly fee"
                title={row.title}
                meta={`${formatDate(row.issuedAt)}${row.paymentMethod ? ` · ${row.paymentMethod}` : ''}`}
                receiptNumber={row.receiptNumber}
                amount={row.amount}
                currency={row.currency}
                endpoint={`api/payments/${row.id}/receipt`}
                filename={`Forex-Navigators-${row.receiptNumber}.pdf`}
                previewTitle={row.title}
              />
            ))
          )}
        </ReceiptSection>

        {otherReceipts.length > 0 ? (
          <ReceiptSection title="Other" count={otherReceipts.length} delay={0.12}>
            {otherReceipts.map((row) => (
              <ReceiptDoc
                key={row.id}
                variant="package"
                typeLabel="Payment"
                title={row.title}
                meta={`${formatDate(row.issuedAt)}${row.paymentMethod ? ` · ${row.paymentMethod}` : ''}`}
                receiptNumber={row.receiptNumber}
                amount={row.amount}
                currency={row.currency}
                endpoint={`api/payments/${row.id}/receipt`}
                filename={`Forex-Navigators-${row.receiptNumber}.pdf`}
                previewTitle={row.title}
              />
            ))}
          </ReceiptSection>
        ) : null}
      </main>
    </div>
  );
}

function ReceiptSection({
  title,
  count,
  delay,
  children,
}: {
  title: string;
  count: number;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      className="receipts-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="receipts-section__head">
        <h2 className="receipts-section__title">{title}</h2>
        <span className="receipts-section__count">{count}</span>
      </div>
      {children}
    </motion.section>
  );
}

function ReceiptDoc({
  variant,
  typeLabel,
  title,
  meta,
  receiptNumber,
  amount,
  currency,
  status,
  endpoint,
  filename,
  previewTitle,
  showAmount = true,
}: {
  variant: 'join' | 'package' | 'monthly';
  typeLabel: string;
  title: string;
  meta: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  status?: string;
  endpoint: string;
  filename: string;
  previewTitle: string;
  showAmount?: boolean;
}) {
  return (
    <article className={`receipts-doc receipts-doc--${variant}`}>
      <div className="receipts-doc__accent" aria-hidden />
      <div className="receipts-doc__body">
        <div className="receipts-doc__main">
          <p className="receipts-doc__type">{typeLabel}</p>
          <h3 className="receipts-doc__title">{title}</h3>
          <p className="receipts-doc__meta">{meta}</p>
          <span className="receipts-doc__id">{receiptNumber}</span>
        </div>
        <div className="receipts-doc__aside">
          {showAmount ? (
            <span className={`receipts-doc__amount${amount === 0 ? ' is-zero' : ''}`}>
              {formatMoney(amount, currency)}
            </span>
          ) : status ? (
            <span className="receipts-doc__status">{status}</span>
          ) : null}
          <div className="receipts-doc__actions">
            <ReceiptActions
              endpoint={endpoint}
              filename={filename}
              label="PDF"
              previewTitle={previewTitle}
              viewClassName={btnView}
              downloadClassName={btnDownload}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
