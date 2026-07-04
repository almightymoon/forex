'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import LandingExperienceRoot from '../../components/landing-experience/LandingExperienceRoot';
import LoadingScreen from '../../components/landing-experience/LoadingScreen';
import ScrollScene from '../../components/landing-experience/ScrollScene';

const Section3 = lazy(() => import('../../components/landing-experience/Section3'));
const Section4 = lazy(() => import('../../components/landing-experience/Section4'));
const Section5 = lazy(() => import('../../components/landing-experience/Section5'));
const SectionLetsWork = lazy(() => import('../../components/landing-experience/SectionLetsWork'));
const SectionMonthlyProgress = lazy(() => import('../../components/landing-experience/SectionMonthlyProgress'));
const SectionNewJoiners = lazy(() => import('../../components/landing-experience/SectionNewJoiners'));
const SectionTestimonials = lazy(() => import('../../components/landing-experience/SectionTestimonials'));
const Footer = lazy(() => import('../../components/landing-experience/Footer'));

export default function HomePage() {
  const mainRef = useRef<HTMLElement>(null);
  const { settings, loading } = useSettings();
  const [introDone, setIntroDone] = useState(false);

  const handleIntroComplete = () => {
    setIntroDone(true);
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
  };

  const showIntro = loading || !introDone;

  if (showIntro) {
    return <LoadingScreen onDone={handleIntroComplete} ready={!loading} />;
  }

  return (
    <LandingExperienceRoot platformName={settings.platformName}>
      <ScrollScene />
      <main ref={mainRef} id="main" tabIndex={-1}>
        <Suspense fallback={null}>
          <Section3 />
          <Section4 />
          <Section5 />
          <SectionMonthlyProgress />
          <SectionLetsWork />
          <SectionNewJoiners />
          <SectionTestimonials />
          <Footer />
        </Suspense>
      </main>
    </LandingExperienceRoot>
  );
}
