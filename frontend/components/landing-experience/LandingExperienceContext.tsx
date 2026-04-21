'use client';

import { createContext, useContext } from 'react';

export type LandingExperienceValue = {
  platformName: string;
};

export const LandingExperienceContext = createContext<LandingExperienceValue>({
  platformName: 'Forex Navigators',
});

export function useLandingExperience() {
  return useContext(LandingExperienceContext);
}
