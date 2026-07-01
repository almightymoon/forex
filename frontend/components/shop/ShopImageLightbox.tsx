'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getProductImageUrl } from '../../lib/publicProducts';

type ShopImageLightboxProps = {
  images: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export default function ShopImageLightbox({
  images,
  index,
  alt = 'Product image',
  onClose,
  onIndexChange,
}: ShopImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const hasMultiple = images.length > 1;
  const current = images[index];

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [hasMultiple, images.length, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onIndexChange((index + 1) % images.length);
  }, [hasMultiple, images.length, index, onIndexChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goPrev, goNext]);

  if (!mounted || !current) return null;

  return createPortal(
    <div
      className="shop-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged product image"
      onClick={onClose}
    >
      <header className="shop-lightbox__header" onClick={(e) => e.stopPropagation()}>
        {hasMultiple ? (
          <span className="shop-lightbox__counter">
            {index + 1} / {images.length}
          </span>
        ) : (
          <span className="shop-lightbox__counter">Product image</span>
        )}
        <button
          type="button"
          className="shop-lightbox__close"
          onClick={onClose}
          aria-label="Close image viewer"
        >
          <X className="shop-lightbox__close-icon" aria-hidden />
          <span>Close</span>
        </button>
      </header>

      <div className="shop-lightbox__body">
        {hasMultiple ? (
          <button
            type="button"
            className="shop-lightbox__nav shop-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" aria-hidden />
          </button>
        ) : null}

        <div className="shop-lightbox__stage" onClick={(e) => e.stopPropagation()}>
          <img
            src={getProductImageUrl(current)}
            alt={alt}
            className="shop-lightbox__image"
            draggable={false}
          />
        </div>

        {hasMultiple ? (
          <button
            type="button"
            className="shop-lightbox__nav shop-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" aria-hidden />
          </button>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="shop-lightbox__footer" onClick={(e) => e.stopPropagation()}>
          <div className="shop-lightbox__thumbs">
            {images.map((img, i) => (
              <button
                key={img}
                type="button"
                className={`shop-lightbox__thumb${i === index ? ' shop-lightbox__thumb--active' : ''}`}
                onClick={() => onIndexChange(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              >
                <img src={getProductImageUrl(img)} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
