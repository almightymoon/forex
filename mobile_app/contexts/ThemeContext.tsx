import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  AppColors,
  createNeo,
  createTypography,
  darkColors,
  getColorsForScheme,
  getGradients,
  lightColors,
} from '../constants/theme';
import {
  ColorSchemeMode,
  DEFAULT_COLOR_SCHEME,
  loadColorScheme,
  saveColorScheme,
} from '../utils/themeStorage';

type ThemeContextValue = {
  colors: AppColors;
  isDark: boolean;
  mode: ColorSchemeMode;
  setMode: (mode: ColorSchemeMode) => Promise<void>;
  typography: ReturnType<typeof createTypography>;
  neo: ReturnType<typeof createNeo>;
  gradients: ReturnType<typeof getGradients>;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ColorSchemeMode>(DEFAULT_COLOR_SCHEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadColorScheme()
      .then(setModeState)
      .finally(() => setReady(true));
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const setMode = useCallback(async (next: ColorSchemeMode) => {
    setModeState(next);
    await saveColorScheme(next);
  }, []);

  const colors = useMemo(() => getColorsForScheme(isDark), [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
      typography: createTypography(colors),
      neo: createNeo(colors, isDark),
      gradients: getGradients(isDark),
      ready,
    }),
    [colors, isDark, mode, setMode, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: lightColors,
      isDark: false,
      mode: DEFAULT_COLOR_SCHEME,
      setMode: async () => {},
      typography: createTypography(lightColors),
      neo: createNeo(lightColors),
      gradients: getGradients(false),
      ready: true,
    };
  }
  return ctx;
}
