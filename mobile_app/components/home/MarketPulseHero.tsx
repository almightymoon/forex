import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from './GlassCard';

type Props = {
  firstName: string;
  courses: number;
  activeSignals: number;
  trendPct?: number;
  onStartNow?: () => void;
  onOpenPulse?: () => void;
};

const CHART_VIEW_W = 320;
const CHART_VIEW_H = 90;
/** Evenly spaced equity-curve samples (0 = top, 1 = bottom of chart) */
const Y_FRACS = [0.78, 0.6, 0.68, 0.46, 0.54, 0.33, 0.4, 0.2, 0.1];
const X_FRACS = Y_FRACS.map((_, i) => i / (Y_FRACS.length - 1));

function buildLinePath(w: number, h: number) {
  return Y_FRACS.map((yf, i) => {
    const x = X_FRACS[i] * w;
    const y = yf * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

function buildAreaPath(w: number, h: number) {
  return `${buildLinePath(w, h)} L ${w} ${h} L 0 ${h} Z`;
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good evening';
}

function marketSession() {
  const now = new Date();
  const day = now.getUTCDay();
  const h = now.getUTCHours();
  // Forex is closed Saturday and Sunday before the Sydney re-open (~22:00 UTC Sun).
  if (day === 6 || (day === 0 && h < 22)) return { label: 'Markets closed', live: false };
  if (h >= 8 && h < 17) return { label: 'London session', live: true };
  if (h >= 13 && h < 22) return { label: 'New York session', live: true };
  if (h < 9) return { label: 'Tokyo session', live: true };
  return { label: 'Sydney session', live: true };
}

/** Animated number that counts up from 0 on mount / value change. */
const CountUp = memo(function CountUp({
  value,
  style,
  pad,
}: {
  value: number;
  style: any;
  pad?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    const run = Animated.timing(anim, {
      toValue: value,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    run.start();
    return () => {
      anim.removeListener(id);
      run.stop();
    };
  }, [value, anim]);

  const text = pad ? String(display).padStart(2, '0') : String(display);
  return <Text style={style}>{text}</Text>;
});

function HeroAurora() {  const { colors } = useTheme();
  const auroraStyles = useMemo(() => createAuroraStyles(colors), [colors]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.8] });

  return (
    <View style={auroraStyles.wrap} pointerEvents="none">
      <Animated.View style={[auroraStyles.orb, auroraStyles.blue, { opacity, transform: [{ scale }] }]} />
      <Animated.View style={[auroraStyles.orb, auroraStyles.cyan, { opacity, transform: [{ scale }] }]} />
    </View>
  );
}

function LivePulseChart({ trendPct }: { trendPct: number }) {  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chartStyles = useMemo(() => createChartStyles(colors), [colors]);
  const auroraStyles = useMemo(() => createAuroraStyles(colors), [colors]);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: 3600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [travel]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setSize({ w: width, h: height });
  };

  const linePath = useMemo(() => buildLinePath(CHART_VIEW_W, CHART_VIEW_H), []);
  const areaPath = useMemo(() => buildAreaPath(CHART_VIEW_W, CHART_VIEW_H), []);

  const dotX = travel.interpolate({ inputRange: [0, 1], outputRange: [0, size.w] });
  const dotY = travel.interpolate({
    inputRange: X_FRACS,
    outputRange: Y_FRACS.map((f) => f * size.h),
  });
  const dotOpacity = travel.interpolate({
    inputRange: [0, 0.06, 0.92, 1],
    outputRange: [0, 1, 1, 0],
  });
  const beamX = travel.interpolate({ inputRange: [0, 1], outputRange: [-40, size.w] });

  const up = trendPct >= 0;

  return (
    <View style={chartStyles.wrap} onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${CHART_VIEW_W} ${CHART_VIEW_H}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.cyan} stopOpacity={0.34} />
            <Stop offset="1" stopColor={colors.cyan} stopOpacity={0} />
          </SvgGradient>
          <SvgGradient id="pulseLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.blue} stopOpacity={0.7} />
            <Stop offset="0.6" stopColor={colors.cyan} stopOpacity={1} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={1} />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#pulseArea)" />
        <Path d={linePath} stroke="url(#pulseLine)" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>

      {size.w > 0 ? (
        <>
          <Animated.View
            style={[chartStyles.beam, { transform: [{ translateX: beamX }] }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(0,212,255,0)', 'rgba(0,212,255,0.22)', 'rgba(0,212,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View
            style={[
              chartStyles.dotWrap,
              { opacity: dotOpacity, transform: [{ translateX: dotX }, { translateY: dotY }] },
            ]}
            pointerEvents="none"
          >
            <View style={chartStyles.dotHalo} />
            <View style={chartStyles.dotCore} />
          </Animated.View>
        </>
      ) : null}

      <View style={[chartStyles.trendPill, up ? chartStyles.trendUp : chartStyles.trendDown]}>
        <Text style={[chartStyles.trendText, { color: up ? colors.success : colors.sell }]}>
          {up ? '▲' : '▼'} {Math.abs(trendPct).toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

function MarketPulseHeroInner({ firstName, courses, activeSignals, trendPct = 1.84, onStartNow, onOpenPulse }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const session = useMemo(marketSession, []);
  const greeting = useMemo(greetingForNow, []);

  return (
    <GlassCard style={styles.wrap} contentStyle={styles.inner} backdrop={<HeroAurora />} radius={28} prominent>
      <View style={styles.headRow}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.eyebrow}>FX NAVIGATORS</Text>
        </View>
        <View style={[styles.sessionPill, !session.live && styles.sessionPillOff]}>
          {session.live ? <LivePip /> : <View style={styles.sessionDotOff} />}
          <Text style={styles.sessionText}>{session.label}</Text>
        </View>
      </View>

      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.name} numberOfLines={1}>
        {firstName}
      </Text>
      <Text style={styles.sub}>Your charts are live. Let&apos;s navigate today&apos;s markets.</Text>

      <Pressable onPress={onOpenPulse} style={({ pressed }) => [styles.chartCard, pressed && styles.pressedSoft]}>
        <LivePulseChart trendPct={trendPct} />
      </Pressable>

      <View style={styles.footRow}>
        <View style={styles.stats}>
          <View style={styles.statBlock}>
            <CountUp value={courses} style={styles.statValue} />
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <CountUp value={activeSignals} style={styles.statValue} pad />
            <Text style={styles.statLabel}>Live signals</Text>
          </View>
        </View>

        <Pressable onPress={onStartNow} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <LinearGradient
            colors={[colors.cyan, colors.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Start now</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </GlassCard>
  );
}

function LivePip() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <View style={styles.pipWrap}>
      <Animated.View style={[styles.pipRing, { opacity, transform: [{ scale }] }]} />
      <View style={styles.pipCore} />
    </View>
  );
}

export const MarketPulseHero = memo(MarketPulseHeroInner);

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { marginBottom: 18 },
  inner: { padding: 18, overflow: 'hidden' },
  pressedSoft: { opacity: 0.92 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, color: colors.textSecondary },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.24)',
  },
  sessionPillOff: { backgroundColor: colors.surfaceHover, borderColor: colors.border },
  sessionText: { fontSize: 10.5, fontWeight: '700', color: colors.textSilver },
  sessionDotOff: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  greeting: { fontSize: 14, fontWeight: '500', color: colors.textSilver },
  name: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: 1 },
  sub: { fontSize: 12.5, fontWeight: '500', color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
  chartCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 10,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statBlock: { gap: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.surfaceHover },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10.5, fontWeight: '600', color: colors.textSecondary },
  cta: { borderRadius: 999, overflow: 'hidden' },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  ctaGradient: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  ctaText: { fontSize: 14, fontWeight: '800', color: '#04101F', letterSpacing: 0.2 },
  pipWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  pipRing: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cyan },
  pipCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
});
}

function createAuroraStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', borderRadius: 999 },
  blue: { width: 240, height: 240, right: -60, top: -50, backgroundColor: 'rgba(3,111,252,0.5)' },
  cyan: { width: 180, height: 180, left: -40, bottom: -40, backgroundColor: 'rgba(0,212,255,0.32)' },
});
}

function createChartStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { height: 92, width: '100%', justifyContent: 'center' },
  beam: { position: 'absolute', top: 0, bottom: 0, width: 44 },
  dotWrap: { position: 'absolute', top: -7, left: -7, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  dotHalo: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,212,255,0.35)' },
  dotCore: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.cyan,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  trendPill: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  trendUp: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.3)' },
  trendDown: { backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.3)' },
  trendText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
}
