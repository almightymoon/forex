import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

/** Dark base with soft blue/indigo bokeh — blurs nicely under GlassCard */
export function AppAmbientBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.base} />

      {/* Electric blue glow — upper right */}
      <View
        style={[
          styles.orb,
          {
            top: height * 0.06,
            right: -width * 0.22,
            width: width * 0.78,
            height: width * 0.78,
            backgroundColor: 'rgba(3,111,252,0.52)',
          },
        ]}
      />

      {/* Indigo wash — center */}
      <View
        style={[
          styles.orb,
          {
            top: height * 0.28,
            left: width * 0.08,
            width: width * 0.62,
            height: width * 0.62,
            backgroundColor: 'rgba(0,85,204,0.36)',
          },
        ]}
      />

      {/* Deep indigo — lower-left */}
      <View
        style={[
          styles.orb,
          {
            bottom: height * 0.08,
            left: -width * 0.28,
            width: width * 0.72,
            height: width * 0.72,
            backgroundColor: 'rgba(0,61,153,0.45)',
          },
        ]}
      />

      {/* Cyan accent — bottom right */}
      <View
        style={[
          styles.orb,
          {
            bottom: height * 0.12,
            right: -width * 0.08,
            width: width * 0.48,
            height: width * 0.48,
            backgroundColor: 'rgba(0,212,255,0.2)',
          },
        ]}
      />

      <LinearGradient
        colors={['rgba(4,8,24,0.55)', 'transparent', 'rgba(4,8,24,0.35)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#040818',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
