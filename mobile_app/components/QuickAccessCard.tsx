import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';

type Props = {
  icon: AppIconName;
  label: string;
  color?: string;
  onPress?: () => void;
};

export function QuickAccessCard({ icon, label, color = '#3AADFF', onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}14`, borderColor: `${color}28` }]}>
        <AppIcon name={icon} size={22} color={color} strokeWidth={2.1} />
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
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
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
