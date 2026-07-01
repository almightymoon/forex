import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorSchemeMode = 'light' | 'dark' | 'system';

const KEY = '@fx/color_scheme';

export const DEFAULT_COLOR_SCHEME: ColorSchemeMode = 'system';

export async function loadColorScheme(): Promise<ColorSchemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_COLOR_SCHEME;
}

export async function saveColorScheme(mode: ColorSchemeMode): Promise<void> {
  await AsyncStorage.setItem(KEY, mode);
}
