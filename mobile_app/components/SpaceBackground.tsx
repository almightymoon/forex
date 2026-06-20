import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

const SPACE_BG = require('../assets/images/space-background.png');

/** Full composite space + earth background (single asset) */
export function SpaceBackground() {
  const { width, height } = useWindowDimensions();

  const aspect = 1024 / 768;
  const baseW = width;
  const baseH = baseW / aspect;
  const scale = Math.max(1, height / baseH) * 1.02;
  const imgW = baseW * scale;
  const imgH = baseH * scale;
  const imgLeft = (width - imgW) / 2;
  const imgTop = height - imgH + height * 0.05;

  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={SPACE_BG}
        style={{
          position: 'absolute',
          top: imgTop,
          left: imgLeft,
          width: imgW,
          height: imgH,
        }}
        resizeMode="cover"
      />

      {/* Top scrim — keeps header / forms readable */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'transparent']}
        locations={[0, 0.22, 0.45]}
        style={[styles.topScrim, { height: height * 0.42 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
