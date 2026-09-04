import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/teacher',
          '/dev',
          '/api',
          '/settings',
          '/profile',
          '/notifications',
          '/withdrawals',
          '/referrals',
          '/mt5',
          '/payment-pending',
          '/monthly-fee',
          '/meeting',
          '/course',
          '/certificates',
          '/select-package',
          '/subscription',
          '/payment',
          '/receipts',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/community',
          '/library',
          '/shop/cart',
          '/shop/my-purchases',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
