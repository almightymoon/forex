import { buildApiUrl } from '../utils/api';

export type ShopProduct = {
  _id?: string;
  productId: string;
  name: string;
  status?: string;
  shortDescription?: string;
  longDescription?: string;
  outcomePromise?: string;
  category?: string;
  tags?: string[];
  primaryImage?: string;
  galleryImages?: string[];
  requirements?: string;
  currentVersion?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  price?: number;
  deliveryUrl?: string;
  updatedAt?: string;
};

export type ProductPurchase = {
  paymentId: string;
  purchasedAt: string;
  amount: number;
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
  // Static shop assets and proxied /uploads work as same-origin relative paths in the browser.
  if (typeof window !== 'undefined') return path;
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (site) return `${site.replace(/\/$/, '')}${path}`;
  // Shop assets live in Next public/ — keep relative for SSR so hydration matches the client.
  if (path.startsWith('/shop/')) return path;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com/api';
  const root = base.replace(/\/api\/?$/, '');
  return `${root}${path}`;
}

export async function fetchPublicProducts(params?: {
  category?: string;
  search?: string;
  tag?: string;
}): Promise<{ products: ShopProduct[]; total: number; categories: string[] }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.tag) qs.set('tag', params.tag);

  try {
    const res = await fetch(buildApiUrl(`api/products?${qs.toString()}`), { cache: 'no-store' });
    if (!res.ok) return { products: [], total: 0, categories: [] };
    return await res.json();
  } catch {
    return { products: [], total: 0, categories: [] };
  }
}

export async function fetchPublicProduct(productId: string): Promise<ShopProduct | null> {
  try {
    const res = await fetch(buildApiUrl(`api/products/${encodeURIComponent(productId)}`), {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMyProductPurchases(token: string): Promise<ProductPurchase[]> {
  try {
    const res = await fetch(buildApiUrl('api/products/my/purchases'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.purchases || [];
  } catch {
    return [];
  }
}
