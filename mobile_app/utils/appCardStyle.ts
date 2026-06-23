import { Platform } from 'react-native';

export type CardStylePreset = 'glass' | 'soft' | 'solid';

export type CardMaterialGroup = 'classic' | 'natural' | 'metal' | 'vivid';

export const CARD_MATERIAL_GROUP_LABELS: Record<CardMaterialGroup, string> = {
  classic: 'Classic',
  natural: 'Wood & stone',
  metal: 'Metal',
  vivid: 'Vivid',
};

export const DEFAULT_CARD_STYLE: CardStylePreset = 'glass';
export const DEFAULT_SOLID_CARD_COLOR = '#141C38';

export type CardMaterialColor = {
  label: string;
  color: string;
  group: CardMaterialGroup;
};

/** Shared palette for Solid fills */
export const CARD_MATERIAL_COLORS: CardMaterialColor[] = [
  { label: 'Navy', color: '#141C38', group: 'classic' },
  { label: 'Midnight', color: '#040818', group: 'classic' },
  { label: 'Charcoal', color: '#121820', group: 'classic' },
  { label: 'Slate', color: '#1a2438', group: 'classic' },
  { label: 'Deep Blue', color: '#0a1830', group: 'classic' },
  { label: 'Pure Black', color: '#000000', group: 'classic' },

  { label: 'Oak', color: '#8B6914', group: 'natural' },
  { label: 'Walnut', color: '#5C4033', group: 'natural' },
  { label: 'Mahogany', color: '#6B3A2A', group: 'natural' },
  { label: 'Cedar', color: '#A67C52', group: 'natural' },
  { label: 'Espresso', color: '#3D2817', group: 'natural' },
  { label: 'Stone', color: '#4A5568', group: 'natural' },
  { label: 'Sandstone', color: '#8B7D6B', group: 'natural' },

  { label: 'Copper', color: '#B87333', group: 'metal' },
  { label: 'Bronze', color: '#8C6A3E', group: 'metal' },
  { label: 'Gold', color: '#C9A227', group: 'metal' },
  { label: 'Silver', color: '#8E9AAF', group: 'metal' },
  { label: 'Rose Gold', color: '#B76E79', group: 'metal' },

  { label: 'Brand Blue', color: '#3AADFF', group: 'vivid' },
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

/** @deprecated use isPresetCardMaterialColor */
export const isPresetSolidCardColor = isPresetCardMaterialColor;

/** @deprecated use CARD_MATERIAL_COLORS */
export const CARD_SOLID_PRESET_COLORS = CARD_MATERIAL_COLORS;

export function normalizeCardStylePreset(value: unknown): CardStylePreset {
  if (value === 'glass' || value === 'soft' || value === 'solid') return value;
  return DEFAULT_CARD_STYLE;
}

export const CARD_STYLE_PRESETS: Array<{
  key: CardStylePreset;
  label: string;
  description: string;
  previewBg: string;
  previewBorder?: string;
}> = [
  {
    key: 'glass',
    label: 'Glassy',
    description: 'Frosted blur with shine',
    previewBg: 'rgba(255,255,255,0.14)',
    previewBorder: 'rgba(255,255,255,0.28)',
  },
  {
    key: 'soft',
    label: 'Soft',
    description: 'Light frost, smoother scroll',
    previewBg: 'rgba(255,255,255,0.07)',
    previewBorder: 'rgba(255,255,255,0.14)',
  },
  {
    key: 'solid',
    label: 'Solid',
    description: 'Flat color panels',
    previewBg: DEFAULT_SOLID_CARD_COLOR,
  },
];

export type CardBorderMode = 'overlay' | 'none';

export type CardStyleSpec = {
  useBlur: boolean;
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

export function getCardStyleSpec(
  preset: CardStylePreset,
  prominent = false,
  solidCardColor = DEFAULT_SOLID_CARD_COLOR,
): CardStyleSpec {
  const ios = Platform.OS === 'ios';

  switch (preset) {
    case 'soft':
      return {
        useBlur: true,
        blurIntensity: prominent ? (ios ? 56 : 48) : ios ? 44 : 36,
        shellBackground: 'rgba(255,255,255,0.05)',
        tintColor: prominent ? 'rgba(12,22,48,0.12)' : 'rgba(12,22,48,0.14)',
        showShine: true,
        shineColors: ['rgba(255,255,255,0.11)', 'rgba(255,255,255,0.03)', 'transparent'],
        borderMode: 'overlay',
        borderColor: 'rgba(255,255,255,0.12)',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 4,
      };
    case 'solid': {
      const base = solidCardColor.trim() || DEFAULT_SOLID_CARD_COLOR;
      return {
        useBlur: false,
        blurIntensity: 0,
        shellBackground: base,
        tintColor: 'transparent',
        showShine: false,
        shineColors: ['transparent', 'transparent', 'transparent'],
        borderMode: 'none',
        borderColor: 'transparent',
        shadowOpacity: prominent ? 0.26 : 0.2,
        shadowRadius: prominent ? 14 : 10,
        elevation: prominent ? 8 : 5,
      };
    }
    case 'glass':
    default:
      return {
        useBlur: true,
        blurIntensity: prominent ? (ios ? 78 : 68) : ios ? 62 : 52,
        shellBackground: 'rgba(255,255,255,0.03)',
        tintColor: prominent ? 'rgba(12,22,48,0.16)' : 'rgba(12,22,48,0.22)',
        showShine: true,
        shineColors: prominent
          ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)', 'transparent']
          : ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.04)', 'transparent'],
        borderMode: 'overlay',
        borderColor: 'rgba(255,255,255,0.14)',
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      };
  }
}
