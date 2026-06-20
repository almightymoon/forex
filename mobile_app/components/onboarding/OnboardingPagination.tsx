import { StyleSheet, View } from 'react-native';

type Props = {
  count: number;
  activeIndex: number;
};

export function OnboardingPagination({ count, activeIndex }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
