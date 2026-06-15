import type { Metadata } from 'next';
import { registerMetadata } from '../../lib/seo';

export const metadata: Metadata = registerMetadata;

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
