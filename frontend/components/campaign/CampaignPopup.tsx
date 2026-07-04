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

const IMAGE_RESET =
  'block max-w-full border-0 bg-transparent p-0 shadow-none outline-none ring-0';

export default function CampaignPopup({ campaign, preview = false, onClose, onCta }: Props) {
  const display = resolveCampaignDisplay(campaign);
  const image = getCampaignImageUrl(campaign.imageUrl);
  const showText = hasTextContent(campaign, display);
  const showFooter = display.showCtaButton || display.showDismissButton;
  const borderless = !display.showBorder;
  const radiusStyle = { borderRadius: display.borderRadius };
  const imageOnlyBorderless = borderless && display.layout === 'image_only' && !showText && !showFooter;

  const handleImageClick = () => {
    if (!display.imageClickable) return;
    onCta?.();
  };

  const closeBtn = (
    <>
      {!preview && onClose ? (
        <button
          type="button"
          onClick={onClose}
          className={
            imageOnlyBorderless
              ? 'absolute right-3 top-3 z-10 rounded-full border-0 bg-black/50 p-2 text-white shadow-lg outline-none backdrop-blur-sm'
              : 'absolute right-3 top-3 z-10 rounded-full border-0 bg-white/90 p-2 text-gray-500 shadow outline-none dark:bg-gray-800'
          }
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <div
          className={
            imageOnlyBorderless
              ? 'absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white shadow-lg'
              : 'absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-500 shadow dark:bg-gray-800'
          }
        >
          <X className="h-4 w-4" />
        </div>
      )}
    </>
  );

  const imageClasses = [
    IMAGE_RESET,
    imageHeightClass(display.imageHeight, borderless),
    imageObjectClass(display.imageFit, borderless),
    'w-full',
  ]
    .filter(Boolean)
    .join(' ');

  const renderImage = () => {
    if (!image) {
      return (
        <div
          className={`flex w-full items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-800 ${imageHeightClass(display.imageHeight, borderless)}`}
          style={radiusStyle}
        >
          No image
        </div>
      );
    }

    const img = (
      <img
        src={image}
        alt=""
        className={imageClasses}
        style={radiusStyle}
        draggable={false}
      />
    );

    if (display.imageClickable && !preview) {
      return (
        <button
          type="button"
          onClick={handleImageClick}
          className={`${IMAGE_RESET} w-full cursor-pointer`}
          style={radiusStyle}
        >
          {img}
        </button>
      );
    }

    return img;
  };

  const shellClass = preview
    ? 'relative flex items-center justify-center p-4'
    : 'fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4';

  if (imageOnlyBorderless) {
    const inner = (
      <div className={`relative w-full max-w-md ${preview ? 'pointer-events-none' : ''}`}>
        {closeBtn}
        {renderImage()}
        {display.imageClickable && preview ? (
          <p className="mt-2 text-center text-[11px] text-gray-400">Tap image opens link/route</p>
        ) : null}
      </div>
    );

    if (preview) {
      return (
        <div className="relative rounded-xl bg-black/55 p-4">
          <div className="mx-auto flex justify-center">{inner}</div>
        </div>
      );
    }

    return <div className={shellClass}>{inner}</div>;
  }

  const cardStyle = { borderRadius: display.borderRadius };
  const cardClasses = [
    'relative w-full max-w-md overflow-hidden',
    display.showBorder
      ? 'border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'
      : 'border-0 bg-transparent shadow-none',
    preview ? 'pointer-events-none' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const card = (
    <div
      className={cardClasses}
      style={cardStyle}
      role="dialog"
      aria-modal={preview ? undefined : true}
    >
      {closeBtn}
      {renderImage()}

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
              className="w-full rounded-xl border-0 bg-blue-600 py-3 text-sm font-bold text-white outline-none hover:bg-blue-700"
            >
              {campaign.cta?.label || 'Learn more'}
            </button>
          ) : null}
          {display.showDismissButton ? (
            <button
              type="button"
              onClick={preview ? undefined : onClose}
              className="w-full border-0 bg-transparent py-2 text-sm font-semibold text-gray-500 outline-none hover:text-gray-700 dark:text-gray-400"
            >
              Maybe later
            </button>
          ) : null}
        </div>
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

  return <div className={shellClass}>{card}</div>;
}
