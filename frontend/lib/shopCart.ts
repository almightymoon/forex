export type CartItem = {
  productId: string;
  name: string;
  price: number;
  primaryImage?: string;
  quantity: number;
};

export const CART_STORAGE_KEY = 'fx_shop_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CartItem =>
          item &&
          typeof item === 'object' &&
          typeof (item as CartItem).productId === 'string' &&
          typeof (item as CartItem).name === 'string' &&
          Number.isFinite(Number((item as CartItem).price))
      )
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        primaryImage: item.primaryImage || '',
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
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
