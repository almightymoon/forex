import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Stagger index — each step adds ~70ms delay */
  index?: number;
  /** Change to replay entrance (e.g. login ↔ signup tab) */
  trigger?: string | number;
  style?: StyleProp<ViewStyle>;
};

export function AuthFadeIn({ children, index = 0, trigger, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);

    const delay = index * 70;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 68,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, trigger, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
