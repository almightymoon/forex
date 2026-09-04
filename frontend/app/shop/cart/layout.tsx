import type { Metadata } from 'next';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cart',
  description: 'Your Forex Navigators shop cart.',
  path: '/shop/cart',
  noIndex: true,
});

export default function ShopCartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
