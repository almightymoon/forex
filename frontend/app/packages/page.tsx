import type { Metadata } from 'next';
import MarketingPageShell from '../../components/landing-experience/MarketingPageShell';
import Packages from './packages';
import PackagesJsonLd from '../../components/seo/PackagesJsonLd';
import { packagesMetadata } from '../../lib/seo';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';

export const metadata: Metadata = packagesMetadata;

export default function PackagesPage() {
  return (
    <MarketingPageShell activePath="/packages">
      <PackagesJsonLd />
      <div data-nav-surface="light">
        <Packages />
      </div>
    </MarketingPageShell>
  );
}
