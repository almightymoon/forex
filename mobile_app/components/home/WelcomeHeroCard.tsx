import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import { GlassCard } from './GlassCard';

type Props = {
  firstName: string;
  courses: number;
  activeSignals: number;
  onStartNow?: () => void;
};

function padStat(n: number) {
  return String(n).padStart(2, '0');
}

/** Bright blue orb placed *behind* the glass blur — reads as a light source through frosted glass */
function HeroLightSource() {
  return (
    <View style={lightStyles.wrap} pointerEvents="none">
      <View style={lightStyles.outerHalo} />
      <View style={lightStyles.midHalo} />
      <View style={lightStyles.core} />
    </View>
  );
}

const lightStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '50%',
    right: -24,
    width: 200,
    height: 200,
    marginTop: -100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(3,111,252,0.28)',
  },
  midHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(3,111,252,0.45)',
  },
  core: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(58,173,255,0.72)',
  },
});

export function WelcomeHeroCard({ firstName, courses, activeSignals, onStartNow }: Props) {
  return (
    <GlassCard
      style={styles.wrap}
      contentStyle={styles.inner}
      backdrop={<HeroLightSource />}
      radius={26}
      prominent
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.welcome}>Welcome Back,</Text>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={styles.sub}>Keep Pushing, Your Next Milestone Awaits</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onStartNow}
          >
            <Text style={styles.btnText}>Start Now</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{courses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{padStat(activeSignals)}</Text>
            <Text style={styles.statLabel}>Active Signals</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  inner: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  welcome: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
    marginBottom: 14,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btnPressed: { opacity: 0.9 },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  stats: {
    width: 96,
    gap: 16,
    flexShrink: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  statBlock: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
  },
});
