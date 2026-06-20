import Svg, { Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

/** Decorative dual-line chart for the home signal card */
export function MiniSignalChart() {
  return (
    <View style={styles.wrap}>
      <Svg width="100%" height="100%" viewBox="0 0 160 72" preserveAspectRatio="none">
        <Path
          d="M0 48 C18 44, 28 58, 44 42 S72 24, 92 36 S124 18, 160 28"
          stroke="rgba(255,193,7,0.95)"
          strokeWidth={2.2}
          fill="none"
        />
        <Path
          d="M0 58 C22 52, 36 62, 56 50 S88 34, 108 46 S132 30, 160 40"
          stroke="rgba(58,173,255,0.95)"
          strokeWidth={2.2}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 72,
    marginBottom: 0,
  },
});
