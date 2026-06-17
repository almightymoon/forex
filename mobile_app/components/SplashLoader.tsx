import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Logo } from './Logo';
import { ScreenBackground } from './ScreenBackground';
import { colors } from '../constants/theme';

type Props = {
  message?: string;
};

export function SplashLoader({ message = 'Preparing your dashboard…' }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const animateDots = () =>
      Animated.loop(
        Animated.stagger(180, [
          Animated.sequence([
            Animated.timing(dot1, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(dot1, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          ]),
        ]),
      );

    const dotsLoop = animateDots();
    dotsLoop.start();

    return () => {
      dotsLoop.stop();
    };
  }, [dot1, dot2, dot3, fade, logoScale, progress, pulse, rise]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.08],
  });
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
  });

  return (
    <ScreenBackground variant="splash">
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0,212,255,0.12)', 'transparent']}
          style={styles.topGlow}
        />
        <LinearGradient
          colors={['transparent', 'rgba(58,173,255,0.1)']}
          style={styles.bottomGlow}
        />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fade,
              transform: [{ translateY: rise }],
            },
          ]}
        >
          <View style={styles.logoWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <Animated.View style={[styles.logoShell, { transform: [{ scale: logoScale }] }]}>
              <Logo size="md" />
            </Animated.View>
          </View>

          <Text style={styles.brand}>FX Navigators</Text>
          <Text style={styles.tagline}>Trading Academy</Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFillWrap, { width: progressWidth }]}>
              <LinearGradient
                colors={['#0060E6', '#3AADFF', '#00D4FF']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.progressFill}
              />
            </Animated.View>
          </View>

          <View style={styles.messageRow}>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.dots}>
              <Animated.View style={[styles.dot, { opacity: dot1 }]} />
              <Animated.View style={[styles.dot, { opacity: dot2 }]} />
              <Animated.View style={[styles.dot, { opacity: dot3 }]} />
            </View>
          </View>
        </Animated.View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: colors.cyan,
  },
  logoShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cyan,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  progressTrack: {
    width: '100%',
    maxWidth: 260,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFillWrap: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    borderRadius: 999,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
});
