import JsonLd from './JsonLd';
import { absoluteUrl, siteConfig } from '../../lib/seo';

export default function AboutJsonLd() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'About',
        item: absoluteUrl('/about'),
      },
    ],
  };

  const aboutPage = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${siteConfig.name}`,
    description:
      'Learn about Forex Navigators — expert forex mentors, structured courses, trading signals, copy trading, and personal coaching.',
    url: absoluteUrl('/about'),
    isPartOf: { '@id': `${absoluteUrl('/')}#website` },
  };

  return <JsonLd data={[aboutPage, breadcrumb]} />;
}
