import JsonLd from './JsonLd';
import { getAllFaqItems } from '../../data/faq-content';
import { absoluteUrl, siteConfig } from '../../lib/seo';

export default function FaqJsonLd() {
  const items = getAllFaqItems();

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

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
        name: 'FAQ',
        item: absoluteUrl('/faq'),
      },
    ],
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `FAQ | ${siteConfig.name}`,
    description:
      'Frequently asked questions about Forex Navigators forex trading courses, signals, live sessions, and membership.',
    url: absoluteUrl('/faq'),
    isPartOf: { '@id': `${absoluteUrl('/')}#website` },
  };

  return <JsonLd data={[webPage, breadcrumb, faqPage]} />;
}
