import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  highlighted?: boolean;
  subtitle?: string;
  compact?: boolean;
};

export function StatCard({ label, value, icon, accent = '#3AADFF', highlighted, subtitle, compact }: Props) {
  const highlightStyle = highlighted
    ? { borderColor: `${accent}55`, shadowColor: accent }
    : undefined;

  if (compact) {
    return (
      <View style={[styles.compactCard, highlighted && styles.cardHighlighted, highlightStyle]}>
        <View style={[styles.compactIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
        <Text style={styles.compactNumber}>{value}</Text>
        <Text style={styles.compactLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted, highlightStyle]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>{icon}</View>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 4,
    minWidth: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardHighlighted: {
    elevation: 4,
    shadowOpacity: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  compactCard: {
    flex: 1,
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  compactIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  compactLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
