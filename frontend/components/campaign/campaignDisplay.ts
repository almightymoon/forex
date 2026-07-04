import type { AppCampaign } from '../../lib/appCampaign';

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

export type CampaignPreviewSource = Pick<
  AppCampaign,
  | 'title'
  | 'body'
  | 'badge'
  | 'imageUrl'
  | 'cta'
  | 'showDismissButton'
  | 'layout'
  | 'showTitle'
  | 'showBody'
  | 'showBadge'
  | 'showCtaButton'
  | 'imageClickable'
  | 'imageFit'
  | 'imageHeight'
>;

export function resolveCampaignDisplay(campaign: CampaignPreviewSource): CampaignDisplayOptions {
  const layout = (campaign.layout as CampaignLayout) || 'standard';

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

export function hasTextContent(
  campaign: CampaignPreviewSource,
  display: CampaignDisplayOptions,
): boolean {
  return (
    (display.showBadge && !!campaign.badge) ||
    (display.showTitle && !!campaign.title) ||
    (display.showBody && !!campaign.body)
  );
}

export function imageHeightClass(height: CampaignImageHeight): string {
  switch (height) {
    case 'compact':
      return 'h-32';
    case 'large':
      return 'h-72';
    case 'auto':
      return 'h-auto max-h-[min(70vh,520px)]';
    case 'medium':
    default:
      return 'h-44';
  }
}

export function imageObjectClass(fit: CampaignImageFit): string {
  return fit === 'contain' ? 'object-contain bg-gray-100 dark:bg-gray-800' : 'object-cover';
}
