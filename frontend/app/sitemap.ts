import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/seo';
import { fetchPublicProducts } from '../lib/publicProducts';

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/packages', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/shop', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/register', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency,
      priority,
    })
  );

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const catalog = await fetchPublicProducts();
    productEntries = (catalog.products || [])
      .filter((p) => p.productId)
      .map((p) => ({
        url: absoluteUrl(`/shop/${encodeURIComponent(p.productId)}`),
        lastModified: p.updatedAt ? new Date(p.updatedAt) : lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
