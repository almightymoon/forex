'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import CampaignPopup from './CampaignPopup';
import {
  fetchActiveCampaign,
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

  return <CampaignPopup campaign={campaign} onClose={close} onCta={onCta} />;
}
