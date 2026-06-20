import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

/** Full pendulum period — float + swing stay in sync */
const LOOP_MS = 5200;
const HALF_LOOP_MS = LOOP_MS / 2;

type Props = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  /** Stagger each slide within the loop (ms) */
  phaseMs?: number;
};

/**
 * Smooth zero-gravity swing — one closed 0→1→0 loop, no mid-cycle jumps.
 */
export function SwingingIllustration({ source, style, phaseMs = 0 }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      motion.setValue(0);
      return;
    }

    const phase = (phaseMs % LOOP_MS) / LOOP_MS;
    motion.setValue(phase);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: HALF_LOOP_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: HALF_LOOP_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: false },
    );

    loop.start();

    return () => loop.stop();
  }, [motion, phaseMs, reduceMotion]);

  const animatedStyle = {
    transform: [
      {
        translateY: motion.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, -11, 0, 11, 0],
        }),
      },
      {
        rotate: motion.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: ['0deg', '-3.5deg', '0deg', '3.5deg', '0deg'],
        }),
      },
    ],
  };

  return (
    <Animated.Image
      source={source}
      style={[style, animatedStyle]}
      resizeMode="contain"
    />
  );
}
