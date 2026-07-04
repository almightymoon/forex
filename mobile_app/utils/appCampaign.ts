import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_BASE, type ApiCacheMode } from './api';

export type AppCampaignCta = {
  label: string;
  action: 'link' | 'route' | 'dismiss_only';
  url?: string;
  route?: string;
};

export type CampaignLayout = 'standard' | 'image_only' | 'image_with_text' | 'custom';
export type CampaignImageFit = 'cover' | 'contain';
export type CampaignImageHeight = 'compact' | 'medium' | 'large' | 'auto';

export type AppCampaign = {
  campaignId: string;
  version: number;
  title: string;
  body?: string;
  badge?: string;
  imageUrl?: string;
  cta: AppCampaignCta;
  showDismissButton?: boolean;
  layout?: CampaignLayout;
  showTitle?: boolean;
  showBody?: boolean;
  showBadge?: boolean;
  showCtaButton?: boolean;
  imageClickable?: boolean;
  imageFit?: CampaignImageFit;
  imageHeight?: CampaignImageHeight;
  dismissMode: 'session' | 'day' | 'campaign';
  frequency: 'once_per_session' | 'once_per_day' | 'every_open';
};

const SESSION_SHOWN = new Set<string>();

function storageKey(campaign: AppCampaign, suffix: string) {
  return `fx_campaign_${suffix}_${campaign.campaignId}_v${campaign.version}`;
}

export function getCampaignImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
}

export async function fetchActiveCampaign(
  platform: 'mobile' | 'web' = 'mobile',
  cache: ApiCacheMode = 'default',
): Promise<AppCampaign | null> {
  try {
    const res = await apiFetch(`api/campaigns/active?platform=${platform}`, { cache });
    if (!res.ok) return null;
    const data = await res.json();
    return data.campaign || null;
  } catch {
    return null;
  }
}

export async function shouldShowCampaign(campaign: AppCampaign): Promise<boolean> {
  if (campaign.frequency === 'once_per_session') {
    if (SESSION_SHOWN.has(campaign.campaignId)) return false;
  }

  if (campaign.frequency === 'once_per_day') {
    const last = await AsyncStorage.getItem(storageKey(campaign, 'last_shown'));
    if (last) {
      const elapsed = Date.now() - Number(last);
      if (elapsed < 24 * 60 * 60 * 1000) return false;
    }
  }

  if (campaign.dismissMode === 'campaign') {
    const dismissed = await AsyncStorage.getItem(storageKey(campaign, 'dismissed'));
    if (dismissed === '1') return false;
  } else if (campaign.dismissMode === 'day') {
    const dismissed = await AsyncStorage.getItem(storageKey(campaign, 'dismissed_day'));
    if (dismissed) {
      const elapsed = Date.now() - Number(dismissed);
      if (elapsed < 24 * 60 * 60 * 1000) return false;
    }
  }

  return true;
}

export async function markCampaignShown(campaign: AppCampaign): Promise<void> {
  SESSION_SHOWN.add(campaign.campaignId);
  await AsyncStorage.setItem(storageKey(campaign, 'last_shown'), String(Date.now()));
}

export async function markCampaignDismissed(campaign: AppCampaign): Promise<void> {
  SESSION_SHOWN.add(campaign.campaignId);
  if (campaign.dismissMode === 'campaign') {
    await AsyncStorage.setItem(storageKey(campaign, 'dismissed'), '1');
  } else if (campaign.dismissMode === 'day') {
    await AsyncStorage.setItem(storageKey(campaign, 'dismissed_day'), String(Date.now()));
  }
  await markCampaignShown(campaign);
}
