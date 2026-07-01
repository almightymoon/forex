import type { Metadata } from 'next';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Library',
  description: 'Forex Navigators resource library.',
  path: '/library',
  noIndex: true,
});

export default function LegacyLibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
