import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

/** Decorative dual-line chart — logo purple + blue */
export function MiniSignalChart() {
  const { colors } = useTheme();
  const strokes = useMemo(
    () => ({
      purple: colors.brandPurple,
      blue: colors.brandBlue,
    }),
    [colors.brandPurple, colors.brandBlue],
  );

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height="100%" viewBox="0 0 160 72" preserveAspectRatio="none">
        <Path
          d="M0 48 C18 44, 28 58, 44 42 S72 24, 92 36 S124 18, 160 28"
          stroke={strokes.purple}
          strokeWidth={2.2}
          fill="none"
        />
        <Path
          d="M0 58 C22 52, 36 62, 56 50 S88 34, 108 46 S132 30, 160 40"
          stroke={strokes.blue}
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
