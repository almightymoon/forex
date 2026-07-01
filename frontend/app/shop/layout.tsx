import type { Metadata } from 'next';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';
import { ShopCartProvider } from '../../context/ShopCartContext';
import { buildPageMetadata } from '../../lib/seo';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import '../../styles/shop.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Shop',
  description:
    'Browse digital products, trading tools, and resources from Forex Navigators. Purchase templates, guides, and premium add-ons.',
  path: '/shop',
  keywords: ['forex shop', 'trading products', 'forex tools', 'digital products'],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingPageShell activePath="/shop">
      <ShopCartProvider>{children}</ShopCartProvider>
    </MarketingPageShell>
  );
}
