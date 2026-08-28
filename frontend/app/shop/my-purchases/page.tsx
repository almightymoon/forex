'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, Loader2, Package, ShoppingBag } from 'lucide-react';
import {
  fetchMyProductPurchases,
  getProductImageUrl,
  type ProductPurchase,
} from '../../../lib/publicProducts';
import ReceiptDownloadButton from '../../../components/ReceiptDownloadButton';

export default function MyPurchasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<ProductPurchase[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?redirect=/shop/my-purchases');
      return;
    }

    let alive = true;
    (async () => {
      const data = await fetchMyProductPurchases(token);
      if (!alive) return;
      setPurchases(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="shop-store" data-nav-surface="light">
      <div className="shop-store__inner" style={{ maxWidth: 880 }}>
        <Link href="/shop" className="shop-product__back">
          ← Shop
        </Link>

        <div className="shop-store__top" style={{ marginBottom: 32 }}>
          <div>
            <p className="shop-product__section-label" style={{ marginBottom: 8 }}>
              Your library
            </p>
            <h1 className="shop-store__title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              My purchases
            </h1>
            <p className="shop-store__subtitle">
              Products appear here once your payment is confirmed by our team.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="shop-store__loading">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" aria-hidden />
          </div>
        ) : purchases.length === 0 ? (
          <div
            className="shop-card-v2"
            style={{ padding: 48, textAlign: 'center', alignItems: 'center' }}
          >
            <ShoppingBag className="mb-4 h-12 w-12 opacity-25" aria-hidden />
            <h2 className="shop-card-v2__name" style={{ marginBottom: 8 }}>
              No purchases yet
            </h2>
            <p className="shop-card-v2__desc" style={{ marginBottom: 24, WebkitLineClamp: 'unset' }}>
              Browse the shop and complete a purchase to see your products here.
            </p>
            <Link href="/shop" className="shop-product__purchase-btn" style={{ textDecoration: 'none' }}>
              Browse shop
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {purchases.map((purchase) => {
              const { product } = purchase;
              return (
                <div
                  key={purchase.paymentId}
                  className="shop-card-v2"
                  style={{ flexDirection: 'row', alignItems: 'stretch' }}
                >
                  <div
                    className="shop-card-v2__media"
                    style={{ width: 140, flexShrink: 0, aspectRatio: 'auto', minHeight: 100 }}
                  >
                    {product.primaryImage ? (
                      <img src={getProductImageUrl(product.primaryImage)} alt="" />
                    ) : (
                      <div className="flex h-full min-h-[100px] items-center justify-center text-black/20">
                        <Package className="h-8 w-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="shop-card-v2__body" style={{ flex: 1 }}>
                    <span className="shop-card-v2__code">{product.productId.toUpperCase()}</span>
                    <h2 className="shop-card-v2__name">{product.name}</h2>
                    {product.shortDescription ? (
                      <p className="shop-card-v2__desc">{product.shortDescription}</p>
                    ) : null}
                    <p className="shop-card-v2__desc" style={{ fontSize: 11, marginTop: 8 }}>
                      Purchased {new Date(purchase.purchasedAt).toLocaleDateString()} · $
                      {Number(purchase.amount).toFixed(2)}
                      {product.currentVersion ? ` · ${product.currentVersion}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <Link
                        href={`/shop/${product.productId}`}
                        className="shop-store__link-btn"
                        style={{ padding: '8px 14px', fontSize: 10 }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        View
                      </Link>
                      {product.deliveryUrl ? (
                        <a
                          href={product.deliveryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shop-product__purchase-btn"
                          style={{
                            minWidth: 0,
                            padding: '8px 16px',
                            fontSize: 10,
                            textDecoration: 'none',
                          }}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          Download
                        </a>
                      ) : null}
                      {purchase.paymentId ? (
                        <ReceiptDownloadButton
                          endpoint={`api/payments/${purchase.paymentId}/receipt`}
                          filename="Forex-Navigators-receipt.pdf"
                          label="Receipt"
                          className="shop-store__link-btn"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
