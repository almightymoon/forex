import { buildApiUrl } from '../utils/api';

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
  showBorder?: boolean;
  imageClickable?: boolean;
  imageFit?: CampaignImageFit;
  imageHeight?: CampaignImageHeight;
  borderRadius?: number;
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
  if (typeof window !== 'undefined') return path;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com/api';
  const root = base.replace(/\/api\/?$/, '');
  return `${root}${path}`;
}

export async function fetchActiveCampaign(platform: 'mobile' | 'web' = 'web'): Promise<AppCampaign | null> {
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(buildApiUrl(`api/campaigns/active?platform=${platform}`), {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.campaign || null;
  } catch {
    return null;
  }
}

export function shouldShowCampaign(campaign: AppCampaign): boolean {
  if (typeof window === 'undefined') return false;

  if (campaign.frequency === 'once_per_session') {
    if (SESSION_SHOWN.has(campaign.campaignId)) return false;
  }

  if (campaign.frequency === 'once_per_day') {
    const last = localStorage.getItem(storageKey(campaign, 'last_shown'));
    if (last && Date.now() - Number(last) < 24 * 60 * 60 * 1000) return false;
  }

  if (campaign.dismissMode === 'campaign') {
    if (localStorage.getItem(storageKey(campaign, 'dismissed')) === '1') return false;
  } else if (campaign.dismissMode === 'day') {
    const dismissed = localStorage.getItem(storageKey(campaign, 'dismissed_day'));
    if (dismissed && Date.now() - Number(dismissed) < 24 * 60 * 60 * 1000) return false;
  }

  return true;
}

export function markCampaignShown(campaign: AppCampaign): void {
  SESSION_SHOWN.add(campaign.campaignId);
  try {
    localStorage.setItem(storageKey(campaign, 'last_shown'), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function markCampaignDismissed(campaign: AppCampaign): void {
  SESSION_SHOWN.add(campaign.campaignId);
  try {
    if (campaign.dismissMode === 'campaign') {
      localStorage.setItem(storageKey(campaign, 'dismissed'), '1');
    } else if (campaign.dismissMode === 'day') {
      localStorage.setItem(storageKey(campaign, 'dismissed_day'), String(Date.now()));
    }
    markCampaignShown(campaign);
  } catch {
    /* ignore */
  }
}
