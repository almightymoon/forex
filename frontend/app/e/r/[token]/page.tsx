'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../../../../utils/api';

type ActionButton = {
  id: string;
  label: string;
  color?: string;
};

type CampaignView = {
  subject: string;
  confirmationMessage: string;
  buttons: ActionButton[];
};

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0ebf8] p-6" style={{ colorScheme: 'light' }}>
      <p className="flex items-center gap-2 text-gray-700">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    </main>
  );
}

function EmailActionInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params?.token || '');
  const buttonFromLink = String(searchParams?.get('b') || '');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [done, setDone] = useState('');
  const [chosen, setChosen] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This link is invalid');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const record = async (buttonId: string) => {
      const res = await fetch(buildApiUrl(`api/public/email-actions/${token}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.campaign && !cancelled) setCampaign(data.campaign);
        throw new Error(data.error || 'Could not record your response');
      }
      if (cancelled) return;
      setCampaign(data.campaign || null);
      setChosen(data.button?.label || '');
      setDone(data.confirmationMessage || 'Thanks, your response has been recorded.');
    };

    (async () => {
      try {
        if (buttonFromLink) {
          await record(buttonFromLink);
          return;
        }
        const res = await fetch(buildApiUrl(`api/public/email-actions/${token}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'This link is invalid or has expired');
        if (cancelled) return;
        setCampaign(data.campaign);
        if (data.existing?.buttonLabel) {
          setChosen(data.existing.buttonLabel);
          setDone(data.campaign?.confirmationMessage || 'Thanks, your response has been recorded.');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'This link is invalid');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, buttonFromLink]);

  const onChoose = async (buttonId: string) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`api/public/email-actions/${token}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.campaign) setCampaign(data.campaign);
        throw new Error(data.error || 'Could not record your response');
      }
      setCampaign(data.campaign || campaign);
      setChosen(data.button?.label || '');
      setDone(data.confirmationMessage || 'Thanks, your response has been recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record your response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error && !campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0ebf8] p-6" style={{ colorScheme: 'light' }}>
        <div className="max-w-md rounded-2xl bg-white p-8 text-center text-gray-900 shadow">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f0ebf8] px-4 py-16 text-gray-900" style={{ colorScheme: 'light' }}>
        <div className="mx-auto max-w-xl rounded-2xl border-t-8 border-red-600 bg-white p-8 shadow">
          <CheckCircle className="mb-3 h-8 w-8 text-green-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Forex Navigators</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">{campaign?.subject || 'Response recorded'}</h1>
          <p className="mt-3 text-gray-700">{done}</p>
          {chosen && <p className="mt-2 text-sm text-gray-500">Your response: {chosen}</p>}
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#f0ebf8] px-4 py-16 text-gray-900 dark:bg-[#f0ebf8] dark:text-gray-900"
      style={{ colorScheme: 'light' }}
    >
      <div className="mx-auto max-w-xl rounded-2xl border-t-8 border-red-600 bg-white p-8 shadow">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Forex Navigators</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{campaign?.subject || 'Choose a response'}</h1>
        <p className="mt-3 text-gray-700">Tap a button below to record your response.</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {(campaign?.buttons || []).map((button) => (
            <button
              key={button.id}
              type="button"
              disabled={submitting}
              onClick={() => onChoose(button.id)}
              className="rounded-lg px-5 py-2.5 font-medium text-white disabled:opacity-50"
              style={{ background: button.color || '#dc2626' }}
            >
              {submitting ? 'Saving…' : button.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function EmailActionPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EmailActionInner />
    </Suspense>
  );
}
