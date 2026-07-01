import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Stagger order — each step delays the reveal by ~70ms */
  index?: number;
  /** Vertical travel distance for the slide-in */
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lightweight staggered entrance — fade + rise.
 * Pure native-driver transforms so it stays buttery on the home deck.
 */
export function AnimatedReveal({ children, index = 0, offset = 18, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      delay: index * 70,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [index, progress]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offset, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
