import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { authTheme } from './authTheme';

const BADGES = [
  { icon: 'lock-closed' as const, label: 'SSL Secured' },
  { icon: 'shield-checkmark' as const, label: 'Protected Data' },
  { icon: 'people' as const, label: 'Trusted by 10,000+ Traders' },
];

export function TrustBadges() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {BADGES.map((badge) => (
        <View key={badge.label} style={styles.chip}>
          <Ionicons name={badge.icon} size={12} color={authTheme.accent} />
          <Text style={styles.label}>{badge.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 20,
    marginHorizontal: -4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.22)',
    backgroundColor: 'rgba(58,173,255,0.06)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: authTheme.textSoft,
    letterSpacing: 0.15,
  },
});
