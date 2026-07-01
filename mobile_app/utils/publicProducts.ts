import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_BASE, type ApiCacheMode } from './api';

export type ShopProduct = {
  productId: string;
  name: string;
  shortDescription?: string;
  longDescription?: string;
  outcomePromise?: string;
  category?: string;
  tags?: string[];
  primaryImage?: string;
  galleryImages?: string[];
  requirements?: string;
  currentVersion?: string;
  price?: number;
  deliveryUrl?: string;
  updatedAt?: string;
};

export type ProductPurchase = {
  paymentId: string;
  purchasedAt: string;
  amount: number;
  quantity?: number;
  product: {
    productId: string;
    name: string;
    shortDescription?: string;
    primaryImage?: string;
    currentVersion?: string;
    deliveryUrl?: string | null;
  };
};

export function getProductImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
}

export async function fetchShopProducts(params?: {
  category?: string;
  search?: string;
  tag?: string;
  limit?: number;
  cache?: ApiCacheMode;
}): Promise<{ products: ShopProduct[]; total: number; categories: string[] }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.limit) qs.set('limit', String(params.limit));

  try {
    const res = await apiFetch(`api/products?${qs.toString()}`, {
      cache: params?.cache ?? 'default',
    });
    if (!res.ok) return { products: [], total: 0, categories: [] };
    return res.json();
  } catch {
    return { products: [], total: 0, categories: [] };
  }
}

export async function fetchShopProduct(
  productId: string,
  cache: ApiCacheMode = 'default',
): Promise<ShopProduct | null> {
  try {
    const res = await apiFetch(`api/products/${encodeURIComponent(productId)}`, { cache });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchMyProductPurchases(): Promise<ProductPurchase[]> {
  try {
    const res = await apiFetch('api/products/my/purchases', { cache: 'reload' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.purchases || [];
  } catch {
    return [];
  }
}

export function formatUsd(amount?: number): string {
  return `$${Number(amount ?? 0).toFixed(2)}`;
}
