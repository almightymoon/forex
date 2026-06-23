import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageSourcePropType } from 'react-native';
import {
  DEFAULT_CARD_STYLE,
  DEFAULT_SOLID_CARD_COLOR,
  normalizeCardStylePreset,
  type CardStylePreset,
} from './appCardStyle';

export type { CardStylePreset };

export type AppBackgroundMode = 'default' | 'image' | 'solid';

export type AppBackgroundPrefs = {
  mode: AppBackgroundMode;
  /** Preset key or `custom` when using library photo */
  imageKey: string;
  customImageUri?: string;
  solidColor: string;
  /** Card surface style — glassy is the app default */
  cardStyle: CardStylePreset;
  /** Fill color when card style is Solid */
  solidCardColor: string;
};

export const APP_BG_STORAGE_KEY = 'app_background_prefs';

export const DEFAULT_APP_BACKGROUND: AppBackgroundPrefs = {
  mode: 'default',
  imageKey: 'space',
  solidColor: '#040818',
  cardStyle: DEFAULT_CARD_STYLE,
  solidCardColor: DEFAULT_SOLID_CARD_COLOR,
};

export const BACKGROUND_PRESET_IMAGES: Array<{
  key: string;
  label: string;
  source: ImageSourcePropType;
}> = [
  { key: 'space', label: 'Space', source: require('../assets/images/space-background.png') },
  { key: 'auth', label: 'Night Sky', source: require('../assets/images/bg-auth.png') },
  { key: 'splash', label: 'Splash', source: require('../assets/images/bg-splash.png') },
];

export const BACKGROUND_PRESET_COLORS: Array<{ label: string; color: string }> = [
  { label: 'Midnight', color: '#040818' },
  { label: 'Deep Black', color: '#00050A' },
  { label: 'Navy', color: '#0a1020' },
  { label: 'Brand Blue', color: '#036FFC' },
  { label: 'Charcoal', color: '#121820' },
  { label: 'Pure Black', color: '#000000' },
];

export function getPresetImageSource(key: string): ImageSourcePropType | null {
  return BACKGROUND_PRESET_IMAGES.find((p) => p.key === key)?.source ?? null;
}

export function isPresetSolidColor(color: string): boolean {
  const normalized = color.trim().toUpperCase();
  return BACKGROUND_PRESET_COLORS.some((p) => p.color.toUpperCase() === normalized);
}

export async function loadAppBackgroundPrefs(): Promise<AppBackgroundPrefs> {
  try {
    const raw = await AsyncStorage.getItem(APP_BG_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_BACKGROUND;
    const parsed = JSON.parse(raw) as Partial<AppBackgroundPrefs>;
    return {
      mode: parsed.mode ?? DEFAULT_APP_BACKGROUND.mode,
      imageKey: parsed.imageKey ?? DEFAULT_APP_BACKGROUND.imageKey,
      customImageUri: parsed.customImageUri,
      solidColor: parsed.solidColor ?? DEFAULT_APP_BACKGROUND.solidColor,
      cardStyle: normalizeCardStylePreset(parsed.cardStyle),
      solidCardColor: parsed.solidCardColor ?? DEFAULT_APP_BACKGROUND.solidCardColor,
    };
  } catch {
    return DEFAULT_APP_BACKGROUND;
  }
}

export async function saveAppBackgroundPrefs(prefs: AppBackgroundPrefs): Promise<void> {
  await AsyncStorage.setItem(APP_BG_STORAGE_KEY, JSON.stringify(prefs));
}
