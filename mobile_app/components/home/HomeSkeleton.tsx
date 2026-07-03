import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

function Bone({ width, height, radius = 12, style }: { width: number | `${number}%`; height: number; radius?: number; style?: object }) {
  const { colors, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? colors.surfaceHover : colors.surfaceInset,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Bone width="100%" height={148} radius={26} />
      <Bone width="100%" height={248} radius={24} />
      <Bone width={140} height={22} radius={8} style={styles.sectionLabel} />
      <Bone width="100%" height={96} radius={20} />
      <Bone width="100%" height={96} radius={20} style={styles.gap} />
      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <Bone width="100%" height={208} radius={20} />
        </View>
        <View style={styles.gridCol}>
          <Bone width="100%" height={208} radius={20} />
        </View>
      </View>
      <Bone width={130} height={22} radius={8} style={styles.sectionLabel} />
      <Bone width="100%" height={96} radius={16} />
      <Bone width="100%" height={300} radius={24} style={styles.sectionLabel} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: 12,
    },
    sectionLabel: {
      marginTop: 12,
    },
    gap: {
      marginTop: 0,
    },
    grid: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    gridCol: {
      flex: 1,
    },
  });
}
