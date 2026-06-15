import type { Metadata } from 'next';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import { termsMetadata } from '../../lib/seo';

export const metadata: Metadata = termsMetadata;

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
