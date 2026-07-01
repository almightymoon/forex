import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageSourcePropType } from 'react-native';
import { colors } from '../constants/theme';
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
  imageKey: string;
  customImageUri?: string;
  solidColor: string;
  cardStyle: CardStylePreset;
  solidCardColor: string;
};

export const APP_BG_STORAGE_KEY = 'app_background_prefs';

export const DEFAULT_APP_BACKGROUND: AppBackgroundPrefs = {
  mode: 'default',
  imageKey: 'space',
  solidColor: colors.background,
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
  { label: 'Light Gray', color: '#F4F4F5' },
  { label: 'White', color: '#FFFFFF' },
  { label: 'Off White', color: '#F9F9F9' },
  { label: 'Lime', color: '#D4FF58' },
  { label: 'Charcoal', color: '#1C1C1E' },
  { label: 'Black', color: '#0F0F0F' },
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
    const next: AppBackgroundPrefs = {
      mode: DEFAULT_APP_BACKGROUND.mode,
      imageKey: DEFAULT_APP_BACKGROUND.imageKey,
      solidColor: DEFAULT_APP_BACKGROUND.solidColor,
      cardStyle: DEFAULT_CARD_STYLE,
      solidCardColor: DEFAULT_SOLID_CARD_COLOR,
    };
    const stale =
      parsed.mode !== next.mode ||
      parsed.imageKey !== next.imageKey ||
      parsed.solidColor !== next.solidColor ||
      normalizeCardStylePreset(parsed.cardStyle) !== next.cardStyle ||
      (parsed.solidCardColor ?? DEFAULT_SOLID_CARD_COLOR) !== next.solidCardColor;
    if (stale) {
      await saveAppBackgroundPrefs(next);
    }
    return next;
  } catch {
    return DEFAULT_APP_BACKGROUND;
  }
}

export async function saveAppBackgroundPrefs(prefs: AppBackgroundPrefs): Promise<void> {
  await AsyncStorage.setItem(APP_BG_STORAGE_KEY, JSON.stringify(prefs));
}
