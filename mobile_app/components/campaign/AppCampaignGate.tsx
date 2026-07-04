import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '../../utils/api';
import {
  fetchActiveCampaign,
  markCampaignShown,
  shouldShowCampaign,
  type AppCampaign,
} from '../../utils/appCampaign';
import { AppCampaignModal } from './AppCampaignModal';

export function AppCampaignGate() {
  const [campaign, setCampaign] = useState<AppCampaign | null>(null);
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    let alive = true;

    const load = async () => {
      // Ensure auth token is loaded so authenticated-audience campaigns resolve correctly.
      await getAuthToken();

      const active = await fetchActiveCampaign('mobile', 'reload');
      if (!alive || !active) return;
      const show = await shouldShowCampaign(active);
      if (!show) return;
      await markCampaignShown(active);
      setCampaign(active);
      setVisible(true);
    };

    void load();

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
