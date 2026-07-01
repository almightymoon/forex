'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  cartItemCount,
  cartItemFromProduct,
  cartTotal,
  loadCart,
  saveCart,
  type CartItem,
} from '../lib/shopCart';

type ShopCartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: {
    productId: string;
    name: string;
    price?: number;
    primaryImage?: string;
  }) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isReady: boolean;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveCart(items);
  }, [items, isReady]);

  const addItem = useCallback(
    (product: { productId: string; name: string; price?: number; primaryImage?: string }) => {
      const base = cartItemFromProduct(product);
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.productId === base.productId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [...prev, { ...base, quantity: 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const qty = Math.floor(quantity);
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      itemCount: cartItemCount(items),
      total: cartTotal(items),
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      isReady,
    }),
    [items, addItem, removeItem, setQuantity, clearCart, isReady]
  );

  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>;
}

export function useShopCart(): ShopCartContextValue {
  const ctx = useContext(ShopCartContext);
  if (!ctx) {
    throw new Error('useShopCart must be used within ShopCartProvider');
  }
  return ctx;
}
