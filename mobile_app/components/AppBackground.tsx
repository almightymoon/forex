import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAppBackground } from '../contexts/AppBackgroundContext';
import { getPresetImageSource } from '../utils/appBackground';
import { SpaceBackground } from './SpaceBackground';

/** App shell background driven by Settings → Appearance */
export function AppBackground() {
  const { prefs } = useAppBackground();
  const { height } = useWindowDimensions();

  if (prefs.mode === 'default') {
    return <SpaceBackground />;
  }

  if (prefs.mode === 'solid') {
    return (
      <View style={[styles.fill, { backgroundColor: prefs.solidColor }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.2)']}
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
    return <SpaceBackground />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: '#000000' }]} pointerEvents="none">
      <Image source={imageSource} style={styles.fillImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(4,8,24,0.65)', 'rgba(4,8,24,0.25)', 'transparent']}
        locations={[0, 0.35, 0.7]}
        style={[styles.topScrim, { height: height * 0.45 }]}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)']}
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
  fillImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
