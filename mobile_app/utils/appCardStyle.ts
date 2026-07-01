import { Platform } from 'react-native';
import { colors as lightColors, type AppColors } from '../constants/theme';

export type CardStylePreset = 'glass' | 'soft' | 'solid';

export type CardMaterialGroup = 'classic' | 'natural' | 'metal' | 'vivid';

export const CARD_MATERIAL_GROUP_LABELS: Record<CardMaterialGroup, string> = {
  classic: 'Classic',
  natural: 'Wood & stone',
  metal: 'Metal',
  vivid: 'Vivid',
};

export const DEFAULT_CARD_STYLE: CardStylePreset = 'glass';
export const DEFAULT_SOLID_CARD_COLOR = '#FFFFFF';

export type CardMaterialColor = {
  label: string;
  color: string;
  group: CardMaterialGroup;
};

export const CARD_MATERIAL_COLORS: CardMaterialColor[] = [
  { label: 'White', color: '#FFFFFF', group: 'classic' },
  { label: 'Off White', color: '#F9F9F9', group: 'classic' },
  { label: 'Light Gray', color: '#F4F4F5', group: 'classic' },
  { label: 'Charcoal', color: '#1C1C1E', group: 'classic' },
  { label: 'Black', color: '#0F0F0F', group: 'classic' },
  { label: 'Midnight', color: '#2C2C2E', group: 'classic' },

  { label: 'Oak', color: '#E8DCC8', group: 'natural' },
  { label: 'Walnut', color: '#D4C4B0', group: 'natural' },
  { label: 'Mahogany', color: '#C9A88E', group: 'natural' },
  { label: 'Cedar', color: '#E5D5C3', group: 'natural' },
  { label: 'Espresso', color: '#8B7355', group: 'natural' },
  { label: 'Stone', color: '#D1D5DB', group: 'natural' },
  { label: 'Sandstone', color: '#E5E0D8', group: 'natural' },

  { label: 'Copper', color: '#E8B88A', group: 'metal' },
  { label: 'Bronze', color: '#D4A574', group: 'metal' },
  { label: 'Gold', color: '#F5D76E', group: 'metal' },
  { label: 'Silver', color: '#E5E5EA', group: 'metal' },
  { label: 'Rose Gold', color: '#E8C4C4', group: 'metal' },

  { label: 'Lime', color: '#D4FF58', group: 'vivid' },
  { label: 'Cyan', color: '#22D3EE', group: 'vivid' },
  { label: 'Emerald', color: '#34D399', group: 'vivid' },
  { label: 'Violet', color: '#A78BFA', group: 'vivid' },
  { label: 'Coral', color: '#FB7185', group: 'vivid' },
  { label: 'Amber', color: '#FBBF24', group: 'vivid' },
];

export const CARD_MATERIAL_GROUPS: CardMaterialGroup[] = ['classic', 'natural', 'metal', 'vivid'];

export function isPresetCardMaterialColor(color: string): boolean {
  const normalized = color.trim().toUpperCase();
  return CARD_MATERIAL_COLORS.some((p) => p.color.toUpperCase() === normalized);
}

export const isPresetSolidCardColor = isPresetCardMaterialColor;
export const CARD_SOLID_PRESET_COLORS = CARD_MATERIAL_COLORS;

export function normalizeCardStylePreset(value: unknown): CardStylePreset {
  if (value === 'glass' || value === 'soft' || value === 'solid') return value;
  return DEFAULT_CARD_STYLE;
}

export function getCardStylePresets(c: AppColors) {
  return [
    {
      key: 'glass' as const,
      label: 'Elevated',
      description: 'Cards with soft shadow',
      previewBg: c.surface,
      previewBorder: c.border,
    },
    {
      key: 'soft' as const,
      label: 'Soft',
      description: 'Subtle flat panels',
      previewBg: c.surfaceInset,
      previewBorder: c.border,
    },
    {
      key: 'solid' as const,
      label: 'Solid',
      description: 'Flat color panels',
      previewBg: DEFAULT_SOLID_CARD_COLOR,
    },
  ];
}

export const CARD_STYLE_PRESETS = getCardStylePresets(lightColors);

export type CardBorderMode = 'overlay' | 'none';

export type CardStyleSpec = {
  useNativeBlur: boolean;
  blurIntensity: number;
  shellBackground: string;
  tintColor: string;
  showShine: boolean;
  shineColors: readonly [string, string, string];
  borderMode: CardBorderMode;
  borderColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

function elevatedSpec(c: AppColors, prominent: boolean, isDark: boolean): Omit<CardStyleSpec, 'useNativeBlur'> {
  return {
    blurIntensity: 0,
    shellBackground: isDark ? c.backgroundElevated : c.surface,
    tintColor: 'transparent',
    showShine: isDark,
    shineColors: isDark
      ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)', 'transparent']
      : ['transparent', 'transparent', 'transparent'],
    borderMode: 'overlay',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : c.border,
    shadowOpacity: isDark ? (prominent ? 0.42 : 0.28) : prominent ? 0.08 : 0.05,
    shadowRadius: prominent ? 20 : 14,
    elevation: prominent ? 5 : 3,
  };
}

function softSpec(c: AppColors, prominent: boolean, isDark: boolean): Omit<CardStyleSpec, 'useNativeBlur'> {
  return {
    blurIntensity: 0,
    shellBackground: isDark ? c.surface : c.surfaceInset,
    tintColor: 'transparent',
    showShine: false,
    shineColors: ['transparent', 'transparent', 'transparent'],
    borderMode: 'overlay',
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : c.border,
    shadowOpacity: isDark ? (prominent ? 0.22 : 0.12) : prominent ? 0.04 : 0.02,
    shadowRadius: prominent ? 10 : 6,
    elevation: prominent ? 2 : 1,
  };
}

export function getCardStyleSpec(
  preset: CardStylePreset,
  prominent = false,
  solidCardColor = DEFAULT_SOLID_CARD_COLOR,
  _cardBlur = Platform.OS === 'ios',
  themeColors: AppColors = lightColors,
  isDark = false,
): CardStyleSpec {
  switch (preset) {
    case 'soft': {
      const base = softSpec(themeColors, prominent, isDark);
      return { useNativeBlur: false, ...base };
    }
    case 'solid': {
      const base = solidCardColor.trim() || (isDark ? themeColors.surface : DEFAULT_SOLID_CARD_COLOR);
      return {
        useNativeBlur: false,
        blurIntensity: 0,
        shellBackground: base,
        tintColor: 'transparent',
        showShine: false,
        shineColors: ['transparent', 'transparent', 'transparent'],
        borderMode: 'overlay',
        borderColor: themeColors.border,
        shadowOpacity: prominent ? 0.06 : 0.04,
        shadowRadius: prominent ? 12 : 8,
        elevation: prominent ? 3 : 2,
      };
    }
    case 'glass':
    default: {
      const base = elevatedSpec(themeColors, prominent, isDark);
      return { useNativeBlur: false, ...base };
    }
  }
}
