'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useShopCart } from '../../context/ShopCartContext';

type ShopCartButtonProps = {
  className?: string;
};

export default function ShopCartButton({ className = 'shop-store__link-btn' }: ShopCartButtonProps) {
  const { itemCount } = useShopCart();

  return (
    <Link href="/shop/cart" className={`${className} shop-cart-btn`} aria-label={`Cart${itemCount ? `, ${itemCount} items` : ''}`}>
      <ShoppingCart className="h-4 w-4" aria-hidden />
      Cart
      {itemCount > 0 ? <span className="shop-cart-btn__badge">{itemCount > 99 ? '99+' : itemCount}</span> : null}
    </Link>
  );
}
