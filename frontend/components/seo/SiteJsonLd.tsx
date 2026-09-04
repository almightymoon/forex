import JsonLd from './JsonLd';
import { absoluteUrl, getSiteUrl, getSocialSameAs, siteConfig } from '../../lib/seo';

export default function SiteJsonLd() {
  const siteUrl = getSiteUrl();
  const sameAs = getSocialSameAs();

  const organization = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': `${siteUrl}/#organization`,
    name: siteConfig.name,
    alternateName: ['The FX Navigators', 'thefxnavigators', 'FX Navigators'],
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon-512.png'),
      width: 512,
      height: 512,
    },
    image: absoluteUrl('/opengraph-image'),
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      addressCountry: siteConfig.address.country,
    },
    areaServed: 'Worldwide',
    knowsAbout: [
      'Forex trading',
      'Forex education',
      'Technical analysis',
      'Risk management',
      'Trading signals',
      'Copy trading',
      'Live forex mentorship',
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: siteConfig.name,
    alternateName: 'thefxnavigators',
    description: siteConfig.description,
    publisher: { '@id': `${siteUrl}/#organization` },
    inLanguage: 'en',
  };

  return <JsonLd data={[organization, website]} />;
}
