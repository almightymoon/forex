'use client';

import { DM_Sans, Inter } from 'next/font/google';
import { useEffect, type ReactNode } from 'react';
import { LandingExperienceContext } from './LandingExperienceContext';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

/** Footer typography aligned to reference (Inter-style geometric sans). */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-landing-footer',
});

type Props = {
  platformName: string;
  children: ReactNode;
};

export default function LandingExperienceRoot({ platformName, children }: Props) {
  useEffect(() => {
    document.documentElement.classList.add('landing-experience-active');
    return () => {
      document.documentElement.classList.remove(
        'landing-experience-active',
        'nav-on-light',
        'scene-done',
      );
    };
  }, []);

  return (
    <LandingExperienceContext.Provider value={{ platformName }}>
      <div className={`${dmSans.className} ${inter.variable}`}>{children}</div>
    </LandingExperienceContext.Provider>
  );
}
