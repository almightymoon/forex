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
  showBorder: boolean;
  imageClickable: boolean;
  imageFit: CampaignImageFit;
  imageHeight: CampaignImageHeight;
  borderRadius: number;
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
  | 'showBorder'
  | 'imageClickable'
  | 'imageFit'
  | 'imageHeight'
  | 'borderRadius'
>;

export function resolveBorderRadius(campaign: CampaignPreviewSource): number {
  const n = campaign.borderRadius;
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.max(0, Math.min(48, Math.round(n)));
  }
  return 16;
}

export function resolveCampaignDisplay(campaign: CampaignPreviewSource): CampaignDisplayOptions {
  const layout = (campaign.layout as CampaignLayout) || 'standard';
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

export function imageHeightClass(height: CampaignImageHeight, borderless = false): string {
  if (borderless || height === 'auto') {
    return 'h-auto w-full max-h-[min(85vh,640px)]';
  }
  switch (height) {
    case 'compact':
      return 'h-32';
    case 'large':
      return 'h-72';
    case 'medium':
    default:
      return 'h-44';
  }
}

export function imageObjectClass(fit: CampaignImageFit, borderless = false): string {
  if (borderless || fit === 'contain') {
    return 'object-contain bg-transparent';
  }
  return 'object-cover';
}
