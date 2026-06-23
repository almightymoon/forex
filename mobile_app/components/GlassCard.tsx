import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useContext, useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppBackgroundContext } from '../contexts/AppBackgroundContext';
import { DEFAULT_APP_BACKGROUND } from '../utils/appBackground';
import { getCardStyleSpec } from '../utils/appCardStyle';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backdrop?: React.ReactNode;
  radius?: number;
  /** Stronger blur + shine — hero cards */
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
  const ctx = useContext(AppBackgroundContext);
  const prefs = ctx?.prefs ?? DEFAULT_APP_BACKGROUND;
  const spec = useMemo(
    () => getCardStyleSpec(prefs.cardStyle, prominent, prefs.solidCardColor),
    [prefs.cardStyle, prominent, prefs.solidCardColor],
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
      {/*
        Single shell — keeps iOS blur compositing correct (BlurView samples
        the scene behind the card the same way as the original glass look).
        Decorations live in an absoluteFill child so Android BlurView
        bringToFront() cannot paint over the content sibling.
      */}
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

          <BlurView
            intensity={spec.blurIntensity}
            tint="dark"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={[StyleSheet.absoluteFill, !spec.useBlur && styles.hidden]}
            pointerEvents="none"
          />

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

/** Inner panel — metric trays, nested rows */
export const glassInnerPanel = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 16,
  overflow: 'hidden' as const,
};

export const glassSectionLabel = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: 'rgba(255,255,255,0.42)',
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  paddingHorizontal: 4,
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
  },
  shell: {
    overflow: 'hidden',
  },
  decorations: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    opacity: 0,
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
