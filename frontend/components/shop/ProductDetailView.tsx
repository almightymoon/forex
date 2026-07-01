'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { getProductImageUrl, type ShopProduct } from '../../lib/publicProducts';
import ShopImageLightbox from './ShopImageLightbox';
import ShopCartButton from './ShopCartButton';
import { useShopCart } from '../../context/ShopCartContext';

type ProductTab = 'details' | 'overview' | 'inside' | 'author' | 'purchase';

const TABS: { id: ProductTab; label: string; sectionId?: string }[] = [
  { id: 'details', label: 'Product Details', sectionId: 'shop-section-details' },
  { id: 'overview', label: 'Overview', sectionId: 'shop-section-overview' },
  { id: 'inside', label: "What's Inside", sectionId: 'shop-section-inside' },
  { id: 'author', label: 'From the Author', sectionId: 'shop-section-author' },
  { id: 'purchase', label: 'Purchase Now', sectionId: 'shop-section-details' },
];

type ProductDetailViewProps = {
  product: ShopProduct;
};

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem } = useShopCart();
  const { settings } = useSettings();
  const platformName = settings.platformName || 'Forex Navigators';
  const [activeTab, setActiveTab] = useState<ProductTab>('details');
  const [activeImage, setActiveImage] = useState(
    product.primaryImage || product.galleryImages?.[0] || null
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const gallery = [
    ...(product.primaryImage ? [product.primaryImage] : []),
    ...(product.galleryImages || []).filter((img) => img !== product.primaryImage),
  ];

  const openLightbox = useCallback(
    (imageUrl: string) => {
      const idx = gallery.indexOf(imageUrl);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [gallery]
  );

  const productCode = product.productId.replace(/-/g, '-').toUpperCase();
  const versionLabel = product.currentVersion?.replace(/^v/i, '') || '1';

  const handleBuy = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/shop/${product.productId}`)}`);
      return;
    }
    router.push(
      `/payment?type=product&productId=${encodeURIComponent(product.productId)}&productName=${encodeURIComponent(product.name)}&amount=${product.price ?? 0}`
    );
  }, [product, router]);

  const handleAddToCart = useCallback(() => {
    addItem(product);
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 2000);
  }, [addItem, product]);

  const scrollToSection = (tab: ProductTab) => {
    setActiveTab(tab);
    const def = TABS.find((t) => t.id === tab);
    if (!def?.sectionId) return;
    const el = document.getElementById(def.sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const overviewText =
    product.longDescription?.trim() ||
    product.shortDescription?.trim() ||
    'Product overview coming soon.';

  const insideText =
    product.outcomePromise?.trim() ||
    (product.tags?.length ? `Includes: ${product.tags.join(', ')}.` : '') ||
    product.shortDescription?.trim() ||
    'See product details for what is included.';

  return (
    <div className="shop-product" data-nav-surface="light">
      <div className="shop-product__inner">
        <div className="shop-product__top-actions">
          <Link href="/shop" className="shop-product__back">
            ← Shop
          </Link>
          <ShopCartButton className="shop-store__link-btn" />
        </div>

        <h1 className="shop-product__page-title">{product.name}</h1>
        <hr className="shop-product__rule" />

        <nav className="shop-product__tabs" aria-label="Product sections">
          {TABS.map((tab, index) => (
            <React.Fragment key={tab.id}>
              {index > 0 ? <span className="shop-product__tab-sep" aria-hidden>|</span> : null}
              <button
                type="button"
                className={`shop-product__tab${activeTab === tab.id ? ' shop-product__tab--active' : ''}`}
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div id="shop-section-details" className="shop-product__hero">
          <div>
            {activeImage ? (
              <button
                type="button"
                className="shop-product__hero-media shop-product__hero-media--clickable"
                onClick={() => openLightbox(activeImage)}
                aria-label="Enlarge product image"
              >
                <img src={getProductImageUrl(activeImage)} alt={product.name} />
              </button>
            ) : (
              <div className="shop-product__hero-media">
                <div
                  className="flex aspect-[4/3] items-center justify-center text-black/25"
                  style={{ background: '#d4d4d8' }}
                >
                  <Package className="h-16 w-16" aria-hidden />
                </div>
              </div>
            )}
            {gallery.length > 1 ? (
              <div className="shop-product__thumbs">
                {gallery.map((img) => (
                  <button
                    key={img}
                    type="button"
                    className={`shop-product__thumb${activeImage === img ? ' shop-product__thumb--active' : ''}`}
                    onClick={() => {
                      setActiveImage(img);
                      openLightbox(img);
                    }}
                    aria-label="View enlarged image"
                  >
                    <img src={getProductImageUrl(img)} alt="" />
                  </button>
                ))}
              </div>
            ) : activeImage ? (
              <p className="shop-product__zoom-hint">Click image to enlarge</p>
            ) : null}
          </div>

          <div className="shop-product__hero-info">
            <span className="shop-product__code">{productCode}</span>
            <p className="shop-product__version">Version: {versionLabel}</p>
            <h2 className="shop-product__name">{product.shortDescription || product.name}</h2>
            <p className="shop-product__author">
              <span className="shop-product__author-mark" aria-hidden>
                FX
              </span>
              Author: {platformName}
            </p>
            {product.shortDescription ? (
              <p className="shop-product__lede">
                <strong>{product.name}</strong>
                <br />
                {product.shortDescription}
              </p>
            ) : (
              <p className="shop-product__lede">{product.name}</p>
            )}
            <button type="button" className="shop-product__purchase-btn" onClick={handleBuy}>
              Purchase Now — ${Number(product.price ?? 0).toFixed(2)}
            </button>
            <p className="shop-product__price-note">
              Pay via USDT (TRC20). Instant access after admin confirms payment.
            </p>
          </div>
        </div>

        <div ref={contentRef} className="shop-product__body">
          <aside className="shop-product__sidebar">
            <div className="shop-product__side-block">
              <p className="shop-product__side-label">Who is this for?</p>
              <p className="shop-product__side-text">
                {product.outcomePromise || product.requirements || 'Traders and students on the Forex Navigators platform.'}
              </p>
            </div>
            <div className="shop-product__side-block">
              <p className="shop-product__side-label">Reviews</p>
              <p className="shop-product__side-text">Reviews will appear here as customers share feedback.</p>
            </div>
            <div className="shop-product__side-block">
              <p className="shop-product__side-label">Questions</p>
              <p className="shop-product__side-text">
                {product.requirements ||
                  'For support or educational pricing, contact us through the contact page.'}
              </p>
            </div>
            <button type="button" className="shop-product__cart-btn" onClick={handleAddToCart}>
              {addedToCart ? 'Added to cart ✓' : `Add to cart — $${Number(product.price ?? 0).toFixed(2)}`}
            </button>
            <Link href="/shop/cart" className="shop-product__cart-link">
              View cart
            </Link>
          </aside>

          <div className="shop-product__content">
            <section id="shop-section-overview">
              <p className="shop-product__section-label">Overview</p>
              <h3 className="shop-product__section-title">{product.name}</h3>
              <p className="shop-product__section-body">{overviewText}</p>
            </section>

            <section id="shop-section-inside">
              <p className="shop-product__section-label">What&apos;s inside</p>
              <h3 className="shop-product__section-title">
                {product.category || product.name}
              </h3>
              <p className="shop-product__section-body">{insideText}</p>
              {product.tags && product.tags.length > 0 ? (
                <div className="shop-product__tags">
                  {product.tags.map((tag) => (
                    <span key={tag} className="shop-product__tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {gallery.length > 0 ? (
                <div className="shop-product__gallery">
                  {gallery.map((img) => (
                    <button
                      key={img}
                      type="button"
                      className="shop-product__gallery-btn"
                      onClick={() => openLightbox(img)}
                      aria-label="Enlarge image"
                    >
                      <img src={getProductImageUrl(img)} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section id="shop-section-author">
              <p className="shop-product__section-label">From the author</p>
              <h3 className="shop-product__section-title">{platformName}</h3>
              <p className="shop-product__section-body">
                {product.longDescription?.trim() ||
                  `${platformName} creates practical trading education, tools, and resources for forex navigators at every stage. This product is maintained and updated as markets evolve.`}
              </p>
            </section>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && gallery.length > 0 ? (
        <ShopImageLightbox
          images={gallery}
          index={lightboxIndex}
          alt={product.name}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(i) => {
            setLightboxIndex(i);
            setActiveImage(gallery[i]);
          }}
        />
      ) : null}
    </div>
  );
}

export function ProductDetailLoading() {
  return (
    <div className="shop-product shop-product__not-found" data-nav-surface="light">
      <Loader2 className="h-8 w-8 animate-spin opacity-40" aria-hidden />
    </div>
  );
}

export function ProductDetailNotFound() {
  return (
    <div className="shop-product" data-nav-surface="light">
      <div className="shop-product__inner shop-product__not-found">
        <Package className="mx-auto mb-4 h-12 w-12 opacity-30" aria-hidden />
        <h1 className="mb-2 text-2xl font-bold">Product not found</h1>
        <p className="mb-6">This product may have been removed or is not published yet.</p>
        <Link href="/shop" className="shop-store__link-btn">
          ← Back to shop
        </Link>
      </div>
    </div>
  );
}
