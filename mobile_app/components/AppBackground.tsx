import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppBackground } from '../contexts/AppBackgroundContext';
import { getPresetImageSource } from '../utils/appBackground';

export function AppBackground() {
  const { prefs } = useAppBackground();
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();

  if (prefs.mode === 'default') {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]} pointerEvents="none">
        <LinearGradient
          colors={
            isDark
              ? ['rgba(167,139,250,0.10)', 'rgba(58,173,255,0.05)', 'transparent']
              : ['rgba(167,139,250,0.06)', 'rgba(58,173,255,0.03)', 'transparent']
          }
          locations={[0, 0.35, 0.72]}
          style={styles.topGlow}
          pointerEvents="none"
        />
        {isDark ? (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            locations={[0.55, 1]}
            style={styles.fill}
            pointerEvents="none"
          />
        ) : null}
      </View>
    );
  }

  if (prefs.mode === 'solid') {
    return (
      <View style={[styles.fill, { backgroundColor: prefs.solidColor }]} pointerEvents="none">
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(0,0,0,0.15)']
              : ['rgba(0,0,0,0.03)', 'transparent', 'rgba(0,0,0,0.02)']
          }
          locations={[0, 0.45, 1]}
          style={styles.fill}
        />
      </View>
    );
  }

  const preset = getPresetImageSource(prefs.imageKey);
  const imageSource =
    prefs.imageKey === 'custom' && prefs.customImageUri
      ? { uri: prefs.customImageUri }
      : preset;

  if (!imageSource) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]} pointerEvents="none" />
    );
  }

  const scrimTop = isDark
    ? ['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.45)']
    : ['rgba(244,244,245,0.92)', 'rgba(244,244,245,0.75)', 'rgba(244,244,245,0.55)'];
  const scrimBottom = isDark
    ? ['transparent', 'rgba(0,0,0,0.9)']
    : ['transparent', 'rgba(244,244,245,0.85)'];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} pointerEvents="none">
      <Image source={imageSource} style={styles.fillImage} resizeMode="cover" />
      <LinearGradient
        colors={scrimTop as [string, string, string]}
        locations={[0, 0.35, 0.7]}
        style={[styles.topScrim, { height: height * 0.55 }]}
      />
      <LinearGradient
        colors={scrimBottom as [string, string]}
        locations={[0.55, 1]}
        style={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  fillImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
