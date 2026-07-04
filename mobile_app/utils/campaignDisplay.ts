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
  imageClickable: boolean;
  imageFit: CampaignImageFit;
  imageHeight: CampaignImageHeight;
};

export function resolveCampaignDisplay(campaign: AppCampaign): CampaignDisplayOptions {
  const layout = campaign.layout || 'standard';

  if (layout === 'image_only') {
    return {
      layout,
      showTitle: false,
      showBody: false,
      showBadge: false,
      showCtaButton: false,
      showDismissButton: false,
      imageClickable: campaign.imageClickable !== false,
      imageFit: campaign.imageFit || 'cover',
      imageHeight: campaign.imageHeight || 'large',
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
      imageClickable: campaign.imageClickable === true,
      imageFit: campaign.imageFit || 'cover',
      imageHeight: campaign.imageHeight || 'medium',
    };
  }

  return {
    layout,
    showTitle: campaign.showTitle !== false,
    showBody: campaign.showBody !== false,
    showBadge: campaign.showBadge !== false,
    showCtaButton: campaign.showCtaButton !== false,
    showDismissButton: campaign.showDismissButton !== false,
    imageClickable: campaign.imageClickable === true,
    imageFit: campaign.imageFit || 'cover',
    imageHeight: campaign.imageHeight || 'medium',
  };
}

export function imageHeightPx(height: CampaignImageHeight): number | undefined {
  switch (height) {
    case 'compact':
      return 128;
    case 'large':
      return 288;
    case 'auto':
      return undefined;
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
