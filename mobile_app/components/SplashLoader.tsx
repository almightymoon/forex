import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { Logo } from './Logo';
import { SpaceBackground } from './SpaceBackground';
import { RotatingPhrase } from './splash/RotatingPhrase';
import { SPLASH_PHRASES } from './splash/splashPhrases';

type Props = {
  message?: string;
};

export function SplashLoader({ message = 'Initializing FX Navigators…' }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;
  const messageFade = useRef(new Animated.Value(1)).current;
  const prevMessage = useRef(message);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(progress, {
            toValue: 0.08,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ),
    ]).start();

    const dotsLoop = Animated.loop(
      Animated.stagger(160, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0.25, duration: 340, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.25, duration: 340, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.25, duration: 340, useNativeDriver: true }),
        ]),
      ]),
    );
    dotsLoop.start();

    return () => dotsLoop.stop();
  }, [dot1, dot2, dot3, fade, logoScale, progress, rise]);

  useEffect(() => {
    if (prevMessage.current === message) return;
    prevMessage.current = message;
    Animated.sequence([
      Animated.timing(messageFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(messageFade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, messageFade]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['6%', '100%'],
  });
  const progressGlow = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.85, 0.5],
  });

  return (
    <View style={styles.screen}>
      <SpaceBackground />
      <View style={styles.scrim} />

      <LinearGradient
        colors={['rgba(3,111,252,0.14)', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,212,255,0.1)']}
        style={styles.bottomGlow}
        pointerEvents="none"
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
        <Animated.View style={[styles.logoShell, { transform: [{ scale: logoScale }] }]}>
          <Logo size="md" />
        </Animated.View>

        <Text style={styles.brand}>TheFxNavigators</Text>
        <Text style={styles.tagline}>Trading Academy</Text>

        <View style={styles.loaderBlock}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFillWrap, { width: progressWidth }]}>
              <View style={styles.progressFill}>
                <LinearGradient
                  colors={['#0253BD', '#036FFC', '#00D4FF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <Animated.View style={[styles.progressHead, { opacity: progressGlow }]} />
            </Animated.View>
          </View>

          <View style={styles.statusRow}>
            <Animated.Text style={[styles.statusText, { opacity: messageFade }]}>
              {message}
            </Animated.Text>
            <View style={styles.dots}>
              <Animated.View style={[styles.dot, { opacity: dot1 }]} />
              <Animated.View style={[styles.dot, { opacity: dot2 }]} />
              <Animated.View style={[styles.dot, { opacity: dot3 }]} />
            </View>
          </View>

          <RotatingPhrase phrases={SPLASH_PHRASES} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#02040A',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cyan,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  loaderBlock: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'visible',
    marginBottom: 14,
  },
  progressFillWrap: {
    height: '100%',
    borderRadius: 999,
    overflow: 'visible',
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressHead: {
    position: 'absolute',
    right: -3,
    top: -1.5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
    shadowColor: '#00D4FF',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 20,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.15,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
});
