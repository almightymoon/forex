import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
  const blurIntensity = prominent
    ? Platform.OS === 'ios'
      ? 78
      : 68
    : Platform.OS === 'ios'
      ? 62
      : 52;

  return (
    <View style={[styles.shadow, { borderRadius: radius }, style]}>
      <View
        style={[
          styles.shell,
          prominent ? styles.shellProminent : styles.shellStandard,
          { borderRadius: radius },
        ]}
      >
        {backdrop}

        <BlurView
          intensity={blurIntensity}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[styles.tint, prominent && styles.tintProminent]}
          pointerEvents="none"
        />

        <LinearGradient
          colors={
            prominent
              ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)', 'transparent']
              : ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.04)', 'transparent']
          }
          locations={[0, 0.22, 0.62]}
          style={[styles.shine, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
          pointerEvents="none"
        />

        <View style={[styles.border, { borderRadius: radius }]} pointerEvents="none" />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

export const GlassCard = memo(GlassCardInner);

/** Inner panel — metric trays, nested rows */
export const glassInnerPanel = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
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
  shadow: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  shell: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  shellStandard: {},
  shellProminent: {},
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,22,48,0.22)',
  },
  tintProminent: {
    backgroundColor: 'rgba(12,22,48,0.16)',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    position: 'relative',
  },
});
