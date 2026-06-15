import JsonLd from './JsonLd';
import { absoluteUrl, getSiteUrl, siteConfig } from '../../lib/seo';

export default function SiteJsonLd() {
  const siteUrl = getSiteUrl();

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteConfig.name,
    alternateName: ['The FX Navigators', 'thefxnavigators'],
    url: siteUrl,
    logo: absoluteUrl('/favicon-48x48.png'),
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      addressCountry: siteConfig.address.country,
    },
    sameAs: [
      'https://x.com',
      'https://www.instagram.com',
      'https://www.linkedin.com',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { '@id': `${siteUrl}/#organization` },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/faq?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const educationalOrg = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${siteUrl}/#educational-organization`,
    name: siteConfig.name,
    url: siteUrl,
    description: siteConfig.description,
    email: siteConfig.contactEmail,
    areaServed: 'Worldwide',
    knowsAbout: [
      'Forex trading',
      'Technical analysis',
      'Risk management',
      'Trading signals',
      'Copy trading',
    ],
  };

  return <JsonLd data={[organization, website, educationalOrg]} />;
}
