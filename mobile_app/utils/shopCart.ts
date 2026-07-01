import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  primaryImage?: string;
  quantity: number;
};

export const CART_STORAGE_KEY = 'fx_shop_cart';

function normalizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as CartItem;
  if (typeof row.productId !== 'string' || typeof row.name !== 'string') return null;
  if (!Number.isFinite(Number(row.price))) return null;
  return {
    productId: row.productId,
    name: row.name,
    price: Number(row.price),
    primaryImage: row.primaryImage || '',
    quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
  };
}

export async function loadCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem).filter((item): item is CartItem => item != null);
  } catch {
    return [];
  }
}

export async function saveCart(items: CartItem[]): Promise<void> {
  await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartItemFromProduct(product: {
  productId: string;
  name: string;
  price?: number;
  primaryImage?: string;
}): Omit<CartItem, 'quantity'> {
  return {
    productId: product.productId,
    name: product.name,
    price: Number(product.price ?? 0),
    primaryImage: product.primaryImage || '',
  };
}
