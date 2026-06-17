import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon: IconName;
  label: string;
  color?: string;
  onPress?: () => void;
};

export function QuickAccessCard({ icon, label, color = '#3AADFF', onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 14,
  },
});
