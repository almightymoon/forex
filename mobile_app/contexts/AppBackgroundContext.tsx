import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppBackgroundPrefs,
  DEFAULT_APP_BACKGROUND,
  loadAppBackgroundPrefs,
  saveAppBackgroundPrefs,
} from '../utils/appBackground';

type AppBackgroundContextValue = {
  prefs: AppBackgroundPrefs;
  loading: boolean;
  setPrefs: (next: AppBackgroundPrefs) => Promise<void>;
  updatePrefs: (patch: Partial<AppBackgroundPrefs>) => Promise<void>;
  resetPrefs: () => Promise<void>;
};

const AppBackgroundContext = createContext<AppBackgroundContextValue | null>(null);

export { AppBackgroundContext };

export function AppBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<AppBackgroundPrefs>(DEFAULT_APP_BACKGROUND);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppBackgroundPrefs()
      .then(setPrefsState)
      .finally(() => setLoading(false));
  }, []);

  const setPrefs = useCallback(async (next: AppBackgroundPrefs) => {
    setPrefsState(next);
    await saveAppBackgroundPrefs(next);
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<AppBackgroundPrefs>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch };
      void saveAppBackgroundPrefs(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(async () => {
    setPrefsState(DEFAULT_APP_BACKGROUND);
    await saveAppBackgroundPrefs(DEFAULT_APP_BACKGROUND);
  }, []);

  const value = useMemo(
    () => ({ prefs, loading, setPrefs, updatePrefs, resetPrefs }),
    [prefs, loading, setPrefs, updatePrefs, resetPrefs],
  );

  return <AppBackgroundContext.Provider value={value}>{children}</AppBackgroundContext.Provider>;
}

export function useAppBackground() {
  const ctx = useContext(AppBackgroundContext);
  if (!ctx) {
    throw new Error('useAppBackground must be used within AppBackgroundProvider');
  }
  return ctx;
}
