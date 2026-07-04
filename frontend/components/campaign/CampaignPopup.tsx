'use client';

import { X } from 'lucide-react';
import { getCampaignImageUrl, type AppCampaign } from '../../lib/appCampaign';
import {
  hasTextContent,
  imageHeightClass,
  imageObjectClass,
  resolveCampaignDisplay,
  type CampaignPreviewSource,
} from './campaignDisplay';

type Props = {
  campaign: CampaignPreviewSource & Partial<Pick<AppCampaign, 'campaignId' | 'version'>>;
  preview?: boolean;
  onClose?: () => void;
  onCta?: () => void;
};

export default function CampaignPopup({ campaign, preview = false, onClose, onCta }: Props) {
  const display = resolveCampaignDisplay(campaign);
  const image = getCampaignImageUrl(campaign.imageUrl);
  const showText = hasTextContent(campaign, display);
  const showFooter = display.showCtaButton || display.showDismissButton;
  const borderless = !display.showBorder;
  const imageOnlyBorderless = borderless && display.layout === 'image_only';
  const imageClasses = [
    imageHeightClass(display.imageHeight),
    'w-full',
    imageObjectClass(display.imageFit, borderless),
    imageOnlyBorderless ? 'rounded-2xl' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardClasses = [
    'relative w-full max-w-md overflow-hidden rounded-2xl',
    imageOnlyBorderless
      ? 'border-0 bg-transparent shadow-none'
      : borderless
        ? 'border-0 bg-white shadow-xl dark:bg-gray-900'
        : 'border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900',
    preview ? 'pointer-events-none' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const closeBtnClasses = imageOnlyBorderless
    ? 'absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white shadow-lg backdrop-blur-sm'
    : 'absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-500 shadow dark:bg-gray-800';

  const handleImageClick = () => {
    if (!display.imageClickable) return;
    onCta?.();
  };

  const card = (
    <div className={cardClasses} role="dialog" aria-modal={preview ? undefined : true}>
      {!preview && onClose ? (
        <button type="button" onClick={onClose} className={closeBtnClasses} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <div className={closeBtnClasses}>
          <X className="h-4 w-4" />
        </div>
      )}

      {image ? (
        display.imageClickable && !preview ? (
          <button type="button" onClick={handleImageClick} className="block w-full">
            <img src={image} alt="" className={imageClasses} />
          </button>
        ) : (
          <img src={image} alt="" className={imageClasses} />
        )
      ) : (
        <div
          className={`flex w-full items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 ${imageHeightClass(display.imageHeight)}`}
        >
          No image
        </div>
      )}

      {showText ? (
        <div className="space-y-3 px-6 pb-2 pt-5">
          {display.showBadge && campaign.badge ? (
            <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {campaign.badge}
            </span>
          ) : null}
          {display.showTitle && campaign.title ? (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.title}</h2>
          ) : null}
          {display.showBody && campaign.body ? (
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{campaign.body}</p>
          ) : null}
        </div>
      ) : null}

      {showFooter ? (
        <div className="space-y-2 px-6 pb-6 pt-4">
          {display.showCtaButton ? (
            <button
              type="button"
              onClick={preview ? undefined : onCta}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              {campaign.cta?.label || 'Learn more'}
            </button>
          ) : null}
          {display.showDismissButton ? (
            <button
              type="button"
              onClick={preview ? undefined : onClose}
              className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Maybe later
            </button>
          ) : null}
        </div>
      ) : null}

      {display.imageClickable && display.layout === 'image_only' && preview ? (
        <p className="px-4 pb-3 text-center text-[11px] text-gray-400">Tap image opens link/route</p>
      ) : null}
    </div>
  );

  if (preview) {
    return (
      <div className="relative rounded-xl bg-black/55 p-4">
        <div className="mx-auto flex justify-center">{card}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      {card}
    </div>
  );
}
