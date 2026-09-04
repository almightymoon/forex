import JsonLd from './JsonLd';
import {
  fetchMergedPublicPackages,
  getDefaultPackages,
  type UiPackage,
} from '../../lib/publicPackages';
import { absoluteUrl, getSiteUrl, siteConfig } from '../../lib/seo';

function packageToCourse(pkg: UiPackage, index: number) {
  const siteUrl = getSiteUrl();
  const id = pkg._id || pkg.name || String(index);
  const url = absoluteUrl(`/packages#${encodeURIComponent(String(id))}`);

  return {
    '@type': 'Course',
    '@id': `${siteUrl}/#course-${encodeURIComponent(String(id))}`,
    name: `${pkg.name} — Forex Trading Package`,
    description:
      pkg.subtitle?.trim() ||
      `${pkg.name} forex trading membership from ${siteConfig.name}: signals, mentorship, and trading tools.`,
    provider: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: siteConfig.name,
    },
    url,
    image: pkg.image ? absoluteUrl(pkg.image) : absoluteUrl('/opengraph-image'),
    educationalLevel: pkg.badge || 'Beginner to Advanced',
    teaches: pkg.features?.length ? pkg.features : ['Forex trading'],
    offers: {
      '@type': 'Offer',
      url,
      price: Number(pkg.price || 0),
      priceCurrency: (pkg.currency || 'USD').toUpperCase(),
      availability: 'https://schema.org/InStock',
      category: 'Forex Trading Education',
    },
  };
}

export default async function PackagesJsonLd() {
  let packages: UiPackage[] = getDefaultPackages();
  try {
    packages = await fetchMergedPublicPackages();
  } catch {
    // keep defaults
  }

  const siteUrl = getSiteUrl();
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${siteUrl}/#forex-packages`,
    name: `${siteConfig.name} Forex Trading Packages`,
    description:
      'Membership packages for learning forex trading — signals, live mentorship, indicators, and auto trading.',
    numberOfItems: packages.length,
    itemListElement: packages.map((pkg, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: packageToCourse(pkg, index),
    })),
  };

  const courses = packages.map((pkg, index) => ({
    '@context': 'https://schema.org',
    ...packageToCourse(pkg, index),
  }));

  return <JsonLd data={[itemList, ...courses]} />;
}
