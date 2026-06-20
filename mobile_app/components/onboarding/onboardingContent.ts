import type { ImageSourcePropType } from 'react-native';

export type OnboardingSlide = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  illustration: ImageSourcePropType;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'intro',
    title: 'Navigate The Forex Markets With Confidence.',
    subtitle: 'Access Signals, Risk Management, And Execution Tools In One Place',
    cta: 'Get Started',
    illustration: require('../../assets/images/image 10.png'),
  },
  {
    id: 'tools',
    title: 'Your Ultimate Trading Companion.',
    subtitle: 'Master The Markets With Elite Tools And Real-Time Insights.',
    cta: 'Next',
    illustration: require('../../assets/images/image 11.png'),
  },
  {
    id: 'community',
    title: 'Join The Community',
    subtitle: 'Engage With Fellow Traders And Build Your Network',
    cta: 'Begin Journey',
    illustration: require('../../assets/images/image 12.png'),
  },
];
