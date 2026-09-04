import type { Metadata } from 'next';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';
import { ShopCartProvider } from '../../context/ShopCartContext';
import { buildPageMetadata } from '../../lib/seo';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import '../../styles/shop.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Forex Shop — Trading Tools & Digital Products',
  description:
    'Browse Forex Navigators shop: trading tools, digital products, templates, and premium add-ons for forex traders.',
  path: '/shop',
  keywords: ['forex shop', 'trading products', 'forex tools', 'digital products', 'forex indicators'],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingPageShell activePath="/shop">
      <ShopCartProvider>{children}</ShopCartProvider>
    </MarketingPageShell>
  );
}
