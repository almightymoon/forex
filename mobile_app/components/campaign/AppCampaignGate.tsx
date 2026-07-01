import { useEffect, useState } from 'react';
import {
  fetchActiveCampaign,
  markCampaignShown,
  shouldShowCampaign,
  type AppCampaign,
} from '../../utils/appCampaign';
import { AppCampaignModal } from './AppCampaignModal';

let sessionChecked = false;

export function AppCampaignGate() {
  const [campaign, setCampaign] = useState<AppCampaign | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionChecked) return;
    sessionChecked = true;

    let alive = true;
    (async () => {
      const active = await fetchActiveCampaign('mobile', 'reload');
      if (!alive || !active) return;
      const show = await shouldShowCampaign(active);
      if (!show) return;
      await markCampaignShown(active);
      setCampaign(active);
      setVisible(true);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!campaign) return null;

  return (
    <AppCampaignModal
      campaign={campaign}
      visible={visible}
      onClose={() => setVisible(false)}
    />
  );
}
