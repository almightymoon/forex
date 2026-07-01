import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getCardStyleSpec } from '../utils/appCardStyle';
import { useCardNativeBlur } from '../utils/deviceCapabilities';
import { FrostedBackdrop } from './glass/FrostedBackdrop';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backdrop?: React.ReactNode;
  radius?: number;
  prominent?: boolean;
};

function GlassCardInner({
  children,
  style,
  contentStyle,
  backdrop,
  radius = 20,
  prominent = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const cardBlur = useCardNativeBlur();
  const spec = useMemo(
    () => getCardStyleSpec('glass', prominent, undefined, cardBlur, colors, isDark),
    [prominent, cardBlur, colors, isDark],
  );

  return (
    <View
      style={[
        styles.outer,
        {
          borderRadius: radius,
          shadowOpacity: spec.shadowOpacity,
          shadowRadius: spec.shadowRadius,
          elevation: spec.elevation,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.shell,
          {
            borderRadius: radius,
            backgroundColor: spec.shellBackground,
          },
        ]}
      >
        <View style={styles.decorations} pointerEvents="none">
          {backdrop ? <View style={StyleSheet.absoluteFill}>{backdrop}</View> : null}

          {spec.useNativeBlur ? (
            <BlurView
              intensity={spec.blurIntensity}
              tint={colors.blurTint}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              {...(Platform.OS === 'android'
                ? { experimentalBlurMethod: 'dimezisBlurView' as const }
                : {})}
            />
          ) : (
            <FrostedBackdrop
              level="glass"
              borderRadius={radius}
              showShine={spec.showShine}
            />
          )}

          {spec.tintColor !== 'transparent' ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: spec.tintColor }]}
              pointerEvents="none"
            />
          ) : null}

          {spec.showShine ? (
            <LinearGradient
              colors={spec.shineColors as [string, string, string]}
              locations={[0, 0.22, 0.62]}
              style={[
                styles.shine,
                { borderTopLeftRadius: radius, borderTopRightRadius: radius },
              ]}
              pointerEvents="none"
            />
          ) : null}

          {spec.borderMode === 'overlay' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.borderOverlay,
                { borderRadius: radius, borderColor: spec.borderColor },
              ]}
              pointerEvents="none"
            />
          ) : null}
        </View>

        <View
          style={[
            styles.content,
            Platform.OS === 'android' && styles.contentAndroid,
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

export const GlassCard = memo(GlassCardInner);

export function glassInnerPanel(colors: { surfaceInset: string }) {
  return {
    backgroundColor: colors.surfaceInset,
    borderRadius: 16,
    overflow: 'hidden' as const,
  };
}

export function glassSectionLabel(colors: { textMuted: string }) {
  return {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: 4,
  };
}

/** @deprecated use glassInnerPanel(useTheme().colors) */
export const glassInnerPanelLegacy = {
  backgroundColor: '#F4F4F5',
  borderRadius: 16,
  overflow: 'hidden' as const,
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
  },
  shell: {
    overflow: 'hidden',
  },
  decorations: {
    ...StyleSheet.absoluteFillObject,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  borderOverlay: {
    borderWidth: 1,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  contentAndroid: {
    elevation: 1,
  },
});
