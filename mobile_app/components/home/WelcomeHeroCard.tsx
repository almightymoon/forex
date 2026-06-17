import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

type Props = {
  firstName: string;
  courses: number;
  activeSignals: number;
  certificates: number;
};

export function WelcomeHeroCard({ firstName, courses, activeSignals, certificates }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#0047B3', '#0066CC', '#00B8E6', '#00D4FF']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.card}
      >
        <View style={styles.orbRight} />
        <View style={styles.orbLeft} />

        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.name}>{firstName} 👋</Text>
        <Text style={styles.sub}>Keep pushing. Your next milestone awaits.</Text>

        <View style={styles.statsRow}>
          <Stat value={courses} label="Courses" />
          <View style={styles.divider} />
          <Stat value={activeSignals} label="Active Signal" />
          <View style={styles.divider} />
          <Stat value={certificates} label="Certificates" />
        </View>
      </LinearGradient>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 32,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  orbRight: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  orbLeft: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  welcome: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 20,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
    paddingTop: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
