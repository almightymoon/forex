import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppColors } from '../../constants/theme';

export type FrostLevel = 'glass' | 'soft' | 'bar' | 'panel';

type FrostLayers = {
  base: string;
  frost: string;
  tint: string;
  shine: readonly [string, string, string];
};

function getLayers(c: AppColors): Record<FrostLevel, FrostLayers> {
  return {
    glass: {
      base: c.surface,
      frost: 'transparent',
      tint: 'transparent',
      shine: ['transparent', 'transparent', 'transparent'],
    },
    soft: {
      base: c.surfaceInset,
      frost: 'transparent',
      tint: 'transparent',
      shine: ['transparent', 'transparent', 'transparent'],
    },
    bar: {
      base: c.surface,
      frost: 'transparent',
      tint: 'transparent',
      shine: ['transparent', 'transparent', 'transparent'],
    },
    panel: {
      base: c.surface,
      frost: 'transparent',
      tint: 'transparent',
      shine: ['transparent', 'transparent', 'transparent'],
    },
  };
}

type Props = {
  level: FrostLevel;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  showShine?: boolean;
};

export function FrostedBackdrop({ level, style, borderRadius = 0, showShine = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const layers = getLayers(colors)[level];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: layers.base }]} />
      {showShine ? (
        <LinearGradient
          colors={layers.shine as [string, string, string]}
          locations={[0, 0.22, 0.62]}
          style={[
            styles.shine,
            {
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
});
}
