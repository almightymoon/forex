import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { NormalizedSignal } from '../../utils/normalize';

type Props = {
  firstName?: string;
  activeSignals?: number;
  topPair?: string;
  topDirection?: NormalizedSignal['direction'];
  enrolledCourses?: number;
  onPress?: () => void;
};

/** Build a small set of context-aware "briefs" — the on-trend AI insight, generated locally. */
function buildBriefs({
  activeSignals = 0,
  topPair,
  topDirection,
  enrolledCourses = 0,
}: Props): string[] {
  const out: string[] = [];
  const h = new Date().getUTCHours();
  const overlap = h >= 13 && h < 17;

  if (activeSignals > 0 && topPair) {
    const dir = topDirection === 'SELL' ? 'short' : 'long';
    out.push(`${activeSignals} live ${activeSignals === 1 ? 'setup' : 'setups'} — ${topPair} is the active ${dir}.`);
  }
  if (overlap) {
    out.push('London–New York overlap is open — highest liquidity window of the day.');
  } else if (h >= 8 && h < 13) {
    out.push('London is driving volume right now — watch EUR and GBP momentum.');
  } else if (h >= 17 && h < 22) {
    out.push('New York session in control — USD pairs are most active.');
  } else {
    out.push('Asian session is quieter — ideal for reviewing your plan and journaling.');
  }
  if (enrolledCourses > 0) {
    out.push('Pick up where you left off — consistency compounds faster than intensity.');
  } else {
    out.push('Start a course to turn market noise into a repeatable edge.');
  }
  out.push('Risk first, profit second — size every position before you click.');
  return out;
}

export function NavigatorBrief(props: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const briefs = useMemo(() => buildBriefs(props), [props]);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (briefs.length <= 1) return;
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 320, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(
        () => {
          setIndex((i) => (i + 1) % briefs.length);
          Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
        },
      );
    }, 5200);
    return () => clearInterval(interval);
  }, [briefs.length, fade]);

  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <AppIcon name="sparkles" size={16} color={colors.cyan} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>NAVIGATOR BRIEF</Text>
        <Animated.Text style={[styles.text, { opacity: fade }]} numberOfLines={2}>
          {briefs[index]}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.18)',
    marginBottom: 18,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.24)',
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4, color: 'rgba(0,212,255,0.85)' },
  text: { fontSize: 12.5, fontWeight: '600', color: colors.textSilver, lineHeight: 17 },
});
}
