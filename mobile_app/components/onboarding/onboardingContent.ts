export type OnboardingVisual = 'desk' | 'learn' | 'community';

export type OnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  visual: OnboardingVisual;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'intro',
    eyebrow: 'Trading desk',
    title: 'Trade with clarity',
    subtitle: 'Live signals, structured risk, and desk tools built for serious forex traders.',
    cta: 'Get started',
    visual: 'desk',
  },
  {
    id: 'tools',
    eyebrow: 'Education',
    title: 'Learn as you trade',
    subtitle: 'Courses, progress tracking, and certificates — all inside one workspace.',
    cta: 'Continue',
    visual: 'learn',
  },
  {
    id: 'community',
    eyebrow: 'Community',
    title: 'Grow with the desk',
    subtitle: 'Channels, live sessions, and traders who push you to level up.',
    cta: 'Begin journey',
    visual: 'community',
  },
];
