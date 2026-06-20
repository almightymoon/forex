import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type OrbitDot = {
  radius: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  tilt: number;
};

const ORBITS: OrbitDot[] = [
  { radius: 92, size: 5, color: '#00D4FF', duration: 6800, delay: 0, tilt: 0 },
  { radius: 108, size: 4, color: '#036FFC', duration: 9200, delay: 400, tilt: 18 },
  { radius: 124, size: 6, color: '#3AADFF', duration: 11000, delay: 900, tilt: -12 },
  { radius: 138, size: 3.5, color: '#FFFFFF', duration: 14000, delay: 200, tilt: 28 },
  { radius: 86, size: 3, color: '#0253BD', duration: 7600, delay: 1200, tilt: -24 },
  { radius: 116, size: 4.5, color: '#00D4FF', duration: 10200, delay: 600, tilt: 8 },
];

const STARS = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: (i * 47 + 13) % 100,
  y: (i * 31 + 7) % 100,
  r: 0.6 + (i % 3) * 0.45,
  phase: (i * 0.17) % 1,
}));

/**
 * Spline-inspired orbital hero — rings, glow core, aurora sweeps, twinkling field.
 */
export function SplashOrbScene() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const corePulse = useRef(new Animated.Value(0)).current;
  const aurora = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const orbitAnims = useRef(ORBITS.map(() => new Animated.Value(0))).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(0.35))).current;

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
    if (reduceMotion) return;
    const loops: Animated.CompositeAnimation[] = [];

    loops.push(
      Animated.loop(
        Animated.timing(ring1, {
          toValue: 1,
          duration: 14000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    loops.push(
      Animated.loop(
        Animated.timing(ring2, {
          toValue: 1,
          duration: 19000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    loops.push(
      Animated.loop(
        Animated.timing(ring3, {
          toValue: 1,
          duration: 24000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    loops.push(
      Animated.loop(
        Animated.sequence([
          Animated.timing(corePulse, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(corePulse, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.push(
      Animated.loop(
        Animated.sequence([
          Animated.timing(aurora, {
            toValue: 1,
            duration: 4200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(aurora, {
            toValue: 0,
            duration: 4200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.push(
      Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ),
    );

    ORBITS.forEach((orbit, i) => {
      loops.push(
        Animated.loop(
          Animated.timing(orbitAnims[i], {
            toValue: 1,
            duration: orbit.duration,
            delay: orbit.delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ),
      );
    });

    STARS.forEach((star, i) => {
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(starAnims[i], {
              toValue: 1,
              duration: 900 + star.phase * 1400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(starAnims[i], {
              toValue: 0.2,
              duration: 900 + star.phase * 1400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ),
      );
    });

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [aurora, corePulse, orbitAnims, reduceMotion, ring1, ring2, ring3, shimmer, starAnims]);

  const spin1 = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const spin3 = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const coreScale = corePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const coreGlow = corePulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });
  const auroraOpacity = aurora.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.55, 0.2] });
  const auroraShift = aurora.interpolate({ inputRange: [0, 1], outputRange: [-28, 28] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.35, 0.08] });

  const orbitDots = useMemo(
    () =>
      ORBITS.map((orbit, i) => {
        const spin = orbitAnims[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        return { ...orbit, spin, key: `orbit-${i}` };
      }),
    [orbitAnims],
  );

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.stage}>
        {STARS.map((star, i) => (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.r * 2,
                height: star.r * 2,
                borderRadius: star.r,
                opacity: starAnims[i],
              },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.aurora,
            {
              opacity: auroraOpacity,
              transform: [{ translateX: auroraShift }, { rotate: '-18deg' }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(3,111,252,0.45)', 'rgba(0,212,255,0.35)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.auroraBand}
          />
        </Animated.View>

        <Animated.View style={[styles.shimmerRing, { opacity: shimmerOpacity }]} />

        <Svg width={300} height={300} viewBox="0 0 300 300" style={styles.svg}>
          <Defs>
            <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00D4FF" stopOpacity="0.55" />
              <Stop offset="45%" stopColor="#036FFC" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#036FFC" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="coreInner" cx="42%" cy="38%" r="55%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="35%" stopColor="#00D4FF" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#0253BD" stopOpacity="0.15" />
            </RadialGradient>
          </Defs>

          <Circle cx={150} cy={150} r={118} fill="url(#coreGlow)" />
          <Ellipse cx={150} cy={150} rx={52} ry={48} fill="url(#coreInner)" opacity={0.85} />
        </Svg>

        <Animated.View
          style={[styles.ringLayer, { transform: [{ rotate: spin1 }, { rotateX: '62deg' }] }]}
        >
          <View style={[styles.orbitRing, styles.ringPrimary]} />
        </Animated.View>
        <Animated.View
          style={[styles.ringLayer, { transform: [{ rotate: spin2 }, { rotateX: '72deg' }, { rotateZ: '24deg' }] }]}
        >
          <View style={[styles.orbitRing, styles.ringSecondary]} />
        </Animated.View>
        <Animated.View
          style={[styles.ringLayer, { transform: [{ rotate: spin3 }, { rotateX: '58deg' }, { rotateZ: '-16deg' }] }]}
        >
          <View style={[styles.orbitRing, styles.ringTertiary]} />
        </Animated.View>

        {orbitDots.map((dot) => (
          <Animated.View
            key={dot.key}
            style={[
              styles.orbitCarrier,
              { transform: [{ rotate: dot.spin }, { rotateZ: `${dot.tilt}deg` }] },
            ]}
          >
            <View
              style={[
                styles.orbitDot,
                {
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  backgroundColor: dot.color,
                  transform: [{ translateX: dot.radius }],
                  shadowColor: dot.color,
                },
              ]}
            />
          </Animated.View>
        ))}

        <Animated.View style={[styles.coreHalo, { opacity: coreGlow, transform: [{ scale: coreScale }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  aurora: {
    position: 'absolute',
    width: 340,
    height: 120,
    top: 88,
  },
  auroraBand: {
    flex: 1,
    borderRadius: 999,
  },
  shimmerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.55)',
    shadowColor: '#00D4FF',
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  ringLayer: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    width: '100%',
    height: '100%',
    borderRadius: 110,
    borderWidth: 1.5,
  },
  ringPrimary: {
    borderColor: 'rgba(0,212,255,0.55)',
    shadowColor: '#00D4FF',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  ringSecondary: {
    borderColor: 'rgba(3,111,252,0.42)',
    borderStyle: 'dashed',
  },
  ringTertiary: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
  },
  orbitCarrier: {
    position: 'absolute',
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  coreHalo: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
  },
});
