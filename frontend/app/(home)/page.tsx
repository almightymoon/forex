'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import CoolLoader from '../../components/CoolLoader';
import LandingExperienceRoot from '../../components/landing-experience/LandingExperienceRoot';
import LoadingScreen from '../../components/landing-experience/LoadingScreen';
import ScrollScene from '../../components/landing-experience/ScrollScene';

const Section3 = lazy(() => import('../../components/landing-experience/Section3'));
const Section4 = lazy(() => import('../../components/landing-experience/Section4'));
const Section5 = lazy(() => import('../../components/landing-experience/Section5'));
const SectionLetsWork = lazy(() => import('../../components/landing-experience/SectionLetsWork'));
const SectionTestimonials = lazy(() => import('../../components/landing-experience/SectionTestimonials'));
const Footer = lazy(() => import('../../components/landing-experience/Footer'));

export default function HomePage() {
  const mainRef = useRef<HTMLElement>(null);
  const { settings, loading } = useSettings();
  const [showLandingLoader, setShowLandingLoader] = useState(true);

  const handleLoaderComplete = () => {
    setShowLandingLoader(false);
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
  };

  if (loading) {
    return (
      <CoolLoader message={`Loading ${settings.platformName}...`} size="md" variant="default" />
    );
  }

  return (
    <LandingExperienceRoot platformName={settings.platformName}>
      <ScrollScene />
      <main ref={mainRef} id="main" tabIndex={-1}>
        <Suspense fallback={null}>
          <Section3 />
          <Section4 />
          <Section5 />
          <SectionLetsWork />
          <SectionTestimonials />
          <Footer />
        </Suspense>
      </main>
      {showLandingLoader && <LoadingScreen onDone={handleLoaderComplete} />}
    </LandingExperienceRoot>
  );
}
