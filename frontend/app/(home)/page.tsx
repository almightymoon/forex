'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import AppCampaignGate from '../../components/campaign/AppCampaignGate';
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
  const { settings, settingsLoaded } = useSettings();
  const [introDone, setIntroDone] = useState(false);

  // Wait for the settings fetch to finish once — avoid !loading flipping
  // true→false→true and remounting the hero under the intro.
  const ready = settingsLoaded;

  const handleIntroComplete = () => {
    setIntroDone(true);
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
  };

  // Mount the dark hero under the loader once settings are ready so the exit
  // fade reveals the hero, not the default white body (no flashbang).
  return (
    <>
      {!introDone && <LoadingScreen onDone={handleIntroComplete} ready={ready} />}
      {ready && (
        <LandingExperienceRoot platformName={settings.platformName}>
          <AppCampaignGate />
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
      )}
    </>
  );
}
