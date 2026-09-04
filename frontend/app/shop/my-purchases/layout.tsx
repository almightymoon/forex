import type { Metadata } from 'next';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Purchases',
  description: 'Your purchased products from the Forex Navigators shop.',
  path: '/shop/my-purchases',
  noIndex: true,
});

export default function MyPurchasesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
