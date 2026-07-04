import type { AppCampaign } from './appCampaign';

export type CampaignLayout = 'standard' | 'image_only' | 'image_with_text' | 'custom';
export type CampaignImageFit = 'cover' | 'contain';
export type CampaignImageHeight = 'compact' | 'medium' | 'large' | 'auto';

export type CampaignDisplayOptions = {
  layout: CampaignLayout;
  showTitle: boolean;
  showBody: boolean;
  showBadge: boolean;
  showCtaButton: boolean;
  showDismissButton: boolean;
  showBorder: boolean;
  imageClickable: boolean;
  imageFit: CampaignImageFit;
  imageHeight: CampaignImageHeight;
  borderRadius: number;
};

export function resolveBorderRadius(campaign: AppCampaign): number {
  const n = campaign.borderRadius;
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.max(0, Math.min(48, Math.round(n)));
  }
  return 16;
}

export function resolveCampaignDisplay(campaign: AppCampaign): CampaignDisplayOptions {
  const layout = campaign.layout || 'standard';
  const showBorder = campaign.showBorder !== false;
  const borderRadius = resolveBorderRadius(campaign);

  if (layout === 'image_only') {
    return {
      layout,
      showTitle: false,
      showBody: false,
      showBadge: false,
      showCtaButton: false,
      showDismissButton: false,
      showBorder,
      imageClickable: campaign.imageClickable !== false,
      imageFit: campaign.imageFit || 'cover',
      imageHeight: showBorder ? campaign.imageHeight || 'large' : 'auto',
      borderRadius,
    };
  }

  if (layout === 'image_with_text') {
    return {
      layout,
      showTitle: campaign.showTitle !== false,
      showBody: campaign.showBody !== false,
      showBadge: campaign.showBadge !== false,
      showCtaButton: false,
      showDismissButton: campaign.showDismissButton !== false,
      showBorder,
      imageClickable: campaign.imageClickable === true,
      imageFit: campaign.imageFit || 'cover',
      imageHeight: campaign.imageHeight || 'medium',
      borderRadius,
    };
  }

  return {
    layout,
    showTitle: campaign.showTitle !== false,
    showBody: campaign.showBody !== false,
    showBadge: campaign.showBadge !== false,
    showCtaButton: campaign.showCtaButton !== false,
    showDismissButton: campaign.showDismissButton !== false,
    showBorder,
    imageClickable: campaign.imageClickable === true,
    imageFit: campaign.imageFit || 'cover',
    imageHeight: campaign.imageHeight || 'medium',
    borderRadius,
  };
}

export function imageHeightPx(height: CampaignImageHeight, borderless = false): number | undefined {
  if (borderless || height === 'auto') return undefined;
  switch (height) {
    case 'compact':
      return 128;
    case 'large':
      return 288;
    case 'medium':
    default:
      return 180;
  }
}

export function hasTextContent(campaign: AppCampaign, display: CampaignDisplayOptions): boolean {
  return (
    (display.showBadge && !!campaign.badge) ||
    (display.showTitle && !!campaign.title) ||
    (display.showBody && !!campaign.body)
  );
}
