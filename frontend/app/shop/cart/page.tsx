'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import ShopCartButton from '../../../components/shop/ShopCartButton';
import { useShopCart } from '../../../context/ShopCartContext';
import { getProductImageUrl } from '../../../lib/publicProducts';

export default function ShopCartPage() {
  const router = useRouter();
  const { items, total, removeItem, setQuantity, isReady } = useShopCart();
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (isReady && items.length === 0) {
      // Stay on empty cart page — no redirect
    }
  }, [isReady, items.length]);

  const handleCheckout = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent('/shop/cart')}`);
      return;
    }
    setCheckingOut(true);
    router.push('/payment?type=cart');
  };

  return (
    <div className="shop-store shop-cart" data-nav-surface="light">
      <div className="shop-store__inner">
        <div className="shop-store__top">
          <div>
            <h1 className="shop-store__title">Cart</h1>
            <p className="shop-store__subtitle">
              Review your items, then checkout with USDT when you&apos;re ready.
            </p>
          </div>
          <div className="shop-store__actions">
            <Link href="/shop" className="shop-store__link-btn">
              ← Continue shopping
            </Link>
            <ShopCartButton />
            <Link href="/shop/my-purchases" className="shop-store__link-btn">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              My purchases
            </Link>
          </div>
        </div>

        {!isReady ? (
          <div className="shop-store__loading">
            <span>Loading cart…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="shop-cart__empty">
            <ShoppingBag className="h-12 w-12 opacity-30" aria-hidden />
            <p>Your cart is empty.</p>
            <Link href="/shop" className="shop-store__link-btn">
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="shop-cart__layout">
            <ul className="shop-cart__list">
              {items.map((item) => (
                <li key={item.productId} className="shop-cart__row">
                  <Link href={`/shop/${item.productId}`} className="shop-cart__thumb">
                    {item.primaryImage ? (
                      <img src={getProductImageUrl(item.primaryImage)} alt="" />
                    ) : (
                      <div className="shop-cart__thumb-placeholder" />
                    )}
                  </Link>
                  <div className="shop-cart__info">
                    <Link href={`/shop/${item.productId}`} className="shop-cart__name">
                      {item.name}
                    </Link>
                    <p className="shop-cart__price">${item.price.toFixed(2)} each</p>
                    <div className="shop-cart__qty">
                      <button
                        type="button"
                        className="shop-cart__qty-btn"
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="shop-cart__qty-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="shop-cart__qty-btn"
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="shop-cart__line-total">
                    <p className="shop-cart__line-amount">${(item.price * item.quantity).toFixed(2)}</p>
                    <button
                      type="button"
                      className="shop-cart__remove"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="shop-cart__summary">
              <h2 className="shop-cart__summary-title">Order summary</h2>
              <div className="shop-cart__summary-row">
                <span>Subtotal ({items.reduce((n, i) => n + i.quantity, 0)} items)</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="shop-cart__summary-note">
                Pay via USDT (TRC20). Access is unlocked after admin confirms your payment.
              </p>
              <button
                type="button"
                className="shop-cart__checkout"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? 'Redirecting…' : `Checkout — $${total.toFixed(2)}`}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
