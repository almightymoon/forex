import { BlurView } from 'expo-blur';
import { ImageBackground, StyleSheet, View, type ViewStyle } from 'react-native';

type Variant = 'splash' | 'auth' | 'app';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
};

const VARIANT_CONFIG: Record<
  Variant,
  { source: number; blur: number; overlay: keyof typeof overlayStyles }
> = {
  splash: {
    source: require('../assets/images/bg-splash.png'),
    blur: 22,
    overlay: 'splash',
  },
  auth: {
    source: require('../assets/images/bg-auth.png'),
    blur: 50,
    overlay: 'auth',
  },
  app: {
    source: require('../assets/images/bg-auth.png'),
    blur: 42,
    overlay: 'app',
  },
};

const overlayStyles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: 'rgba(0, 5, 15, 0.12)',
  },
  auth: {
    flex: 1,
    backgroundColor: 'rgba(0, 5, 15, 0.36)',
  },
  app: {
    flex: 1,
    backgroundColor: 'rgba(0, 5, 15, 0.28)',
  },
});

export function ScreenBackground({ children, variant = 'auth', style }: Props) {
  const config = VARIANT_CONFIG[variant];

  return (
    <ImageBackground source={config.source} style={[styles.background, style]} resizeMode="cover">
      <BlurView intensity={config.blur} tint="dark" style={styles.blurLayer} />
      <View style={overlayStyles[config.overlay]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#00050A',
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
