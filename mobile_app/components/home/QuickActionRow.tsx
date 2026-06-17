import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';
import { colors } from '../../constants/theme';

export type QuickAction = {
  id: string;
  icon: AppIconName;
  label: string;
  color: string;
  onPress: () => void;
};

type Props = {
  actions: QuickAction[];
};

export function QuickActionRow({ actions }: Props) {
  return (
    <View style={styles.wrap}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          onPress={action.onPress}
        >
          <View style={[styles.circle, { backgroundColor: `${action.color}14`, borderColor: `${action.color}30` }]}>
            <AppIcon name={action.icon} size={24} color={action.color} strokeWidth={2.2} />
          </View>
          <Text style={styles.label} numberOfLines={1}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.85 },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
