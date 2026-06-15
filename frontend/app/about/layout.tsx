import type { Metadata } from 'next';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import { aboutMetadata } from '../../lib/seo';
import AboutJsonLd from '../../components/seo/AboutJsonLd';

export const metadata: Metadata = aboutMetadata;

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AboutJsonLd />
      {children}
    </>
  );
}
