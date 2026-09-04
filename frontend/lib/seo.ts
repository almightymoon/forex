import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'https://thefxnavigators.com';
const DEFAULT_SITE_NAME = 'Forex Navigators';

export const siteConfig = {
  name: DEFAULT_SITE_NAME,
  shortName: 'Forex Navigators',
  tagline: 'Master the Art of Forex Trading',
  description:
    'Forex Navigators is a premier forex trading education platform. Learn forex trading from expert mentors with structured courses, live sessions, real-time trading signals, copy trading, and a global trader community.',
  keywords: [
    'forex',
    'forex trading',
    'forex navigators',
    'thefxnavigators',
    'forex education',
    'forex courses',
    'learn forex',
    'learn forex trading',
    'forex trading course',
    'best forex trading course',
    'forex academy',
    'online forex academy',
    'forex mentorship',
    'forex trading signals',
    'forex signals',
    'copy trading',
    'live forex sessions',
    'forex trading for beginners',
    'forex trading Malaysia',
    'forex course Malaysia',
    'forex trading platform',
    'trading education',
    'how to trade forex',
    'forex trading school',
  ],
  locale: 'en_MY',
  twitterHandle: '@thefxnavigators',
  contactEmail: 'thefxnavigators@gmail.com',
  address: {
    locality: 'Kuala Lumpur',
    region: 'Johor',
    country: 'MY',
  },
  /** Real profile URLs only — empty entries are omitted from JSON-LD sameAs */
  social: {
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL || 'https://x.com/thefxnavigators',
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || '',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || '',
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || '',
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || '',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_INVITE_URL || '',
  },
} as const;

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.FRONTEND_URL ||
    DEFAULT_SITE_URL;
  return url.replace(/\/$/, '');
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getSocialSameAs(): string[] {
  return Object.values(siteConfig.social).filter((url): url is string => Boolean(url?.trim()));
}

type PageSeoInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogType?: 'website' | 'article';
  image?: string;
};

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  noIndex = false,
  ogType = 'website',
  image,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle =
    path === '/' ? `${siteConfig.name} — ${siteConfig.tagline}` : `${title} | ${siteConfig.name}`;
  const mergedKeywords = Array.from(new Set([...siteConfig.keywords, ...keywords]));
  const ogImage =
    image && /^https?:\/\//i.test(image) ? image : absoluteUrl(image || '/opengraph-image');

  return {
    title: fullTitle,
    description,
    keywords: mergedKeywords,
    authors: [{ name: siteConfig.name, url: getSiteUrl() }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    applicationName: siteConfig.name,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    openGraph: {
      type: ogType,
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — ${siteConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
      images: [ogImage],
    },
    category: 'education',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: '/favicon.ico',
    },
  };
}

export const homeMetadata = buildPageMetadata({
  title: siteConfig.name,
  description: siteConfig.description,
  path: '/',
  keywords: [
    'forex navigators course',
    'professional forex mentorship',
    'forex trading signals service',
    'forex trading academy Malaysia',
  ],
});

export const aboutMetadata = buildPageMetadata({
  title: 'About Us',
  description:
    'Meet the Forex Navigators team. 9+ years of live market experience, structured forex courses, trading signals, copy trading, and personal coaching for traders worldwide.',
  path: '/about',
  keywords: ['about forex navigators', 'forex mentors', 'forex trading experts'],
});

export const faqMetadata = buildPageMetadata({
  title: 'FAQ',
  description:
    'Answers to common questions about Forex Navigators — courses, trading signals, live sessions, billing, community support, and getting started with forex trading.',
  path: '/faq',
  keywords: ['forex faq', 'forex trading questions', 'forex course help'],
});

export const contactMetadata = buildPageMetadata({
  title: 'Contact',
  description:
    'Contact Forex Navigators for support, partnerships, or questions about our forex trading courses, signals, and mentorship programs. We respond within 24 hours.',
  path: '/contact',
  keywords: ['contact forex navigators', 'forex support', 'forex help desk'],
});

export const termsMetadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for Forex Navigators — rules, responsibilities, and policies for using our forex trading education platform.',
  path: '/terms',
});

export const packagesMetadata = buildPageMetadata({
  title: 'Forex Trading Packages & Courses',
  description:
    'Compare Forex Navigators membership packages — FX Launch, FX Scale, and FX Legacy. Forex trading signals, live mentorship, premium indicators, and auto trading access.',
  path: '/packages',
  keywords: [
    'forex trading packages',
    'forex course pricing',
    'forex membership',
    'buy forex course',
    'forex mentorship package',
  ],
});

export const registerMetadata = buildPageMetadata({
  title: 'Create Account',
  description:
    'Join Forex Navigators today. Create your account and start learning forex trading with expert-led courses, live mentorship, and real-time signals.',
  path: '/register',
  keywords: ['sign up forex course', 'join forex navigators', 'forex trading registration'],
});

export const loginMetadata = buildPageMetadata({
  title: 'Sign In',
  description:
    'Sign in to your Forex Navigators account to access courses, trading signals, live sessions, and your student dashboard.',
  path: '/login',
  noIndex: true,
});
