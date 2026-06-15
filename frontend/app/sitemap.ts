import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/seo';

const publicRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/register', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/forgot-password', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/community', changeFrequency: 'weekly', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
