import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  phrases: readonly string[];
  intervalMs?: number;
};

/** Cross-fades through splash taglines beneath the loader */
export function RotatingPhrase({ phrases, intervalMs = 2800 }: Props) {  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phrases.length <= 1) return;

    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 8,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setIndex((prev) => (prev + 1) % phrases.length);
        slide.setValue(-8);
        Animated.parallel([
          Animated.timing(fade, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slide, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [fade, intervalMs, phrases.length, slide]);

  return (
    <View style={styles.wrap}>
      <Animated.Text
        style={[
          styles.text,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        {phrases[index]}
      </Animated.Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    minHeight: 22,
    marginTop: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
});
}
