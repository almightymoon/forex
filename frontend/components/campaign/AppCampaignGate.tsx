'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchActiveCampaign,
  getCampaignImageUrl,
  markCampaignDismissed,
  markCampaignShown,
  shouldShowCampaign,
  type AppCampaign,
} from '../../lib/appCampaign';

export default function AppCampaignGate() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<AppCampaign | null>(null);
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    let alive = true;
    (async () => {
      const active = await fetchActiveCampaign('web');
      if (!alive || !active) return;
      if (!shouldShowCampaign(active)) return;
      markCampaignShown(active);
      setCampaign(active);
      setVisible(true);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!visible || !campaign) return null;

  const close = () => {
    markCampaignDismissed(campaign);
    setVisible(false);
  };

  const onCta = () => {
    const action = campaign.cta?.action || 'dismiss_only';
    if (action === 'link' && campaign.cta?.url) {
      window.open(campaign.cta.url, '_blank', 'noopener,noreferrer');
    } else if (action === 'route' && campaign.cta?.route) {
      router.push(campaign.cta.route);
    }
    close();
  };

  const image = getCampaignImageUrl(campaign.imageUrl);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-500 shadow dark:bg-gray-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {image ? (
          <img src={image} alt="" className="h-44 w-full object-cover" />
        ) : null}

        <div className="space-y-3 px-6 pb-2 pt-5">
          {campaign.badge ? (
            <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {campaign.badge}
            </span>
          ) : null}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.title}</h2>
          {campaign.body ? (
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{campaign.body}</p>
          ) : null}
        </div>

        <div className="space-y-2 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onCta}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            {campaign.cta?.label || 'Learn more'}
          </button>
          {campaign.showDismissButton !== false ? (
            <button
              type="button"
              onClick={close}
              className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Maybe later
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
