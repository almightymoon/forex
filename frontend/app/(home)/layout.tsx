import type { Metadata } from 'next';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import { homeMetadata } from '../../lib/seo';

export const metadata: Metadata = homeMetadata;

export default function HomeRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
