import type { Metadata } from 'next';
import '../../styles/landing-experience-app.css';
import '../../styles/landing-experience-doc.css';
import { faqMetadata } from '../../lib/seo';
import FaqJsonLd from '../../components/seo/FaqJsonLd';

export const metadata: Metadata = faqMetadata;

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FaqJsonLd />
      {children}
    </>
  );
}
