import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';
import { GlassCard } from '../GlassCard';
import { glassSectionLabel } from '../GlassCard';

export type QuickAccessItem = {
  icon: AppIconName;
  label: string;
  color?: string;
  onPress: () => void;
};

type Props = {
  items: QuickAccessItem[];
};

export function MenuQuickGrid({ items }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={glassSectionLabel}>Quick access</Text>
      <GlassCard contentStyle={styles.grid} radius={18}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={item.onPress}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.color ?? '#3AADFF'}18` }]}>
              <AppIcon name={item.icon} size={20} color={item.color ?? '#3AADFF'} strokeWidth={2.1} />
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>{item.label}</Text>
          </Pressable>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '48%',
    minHeight: 76,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tilePressed: { opacity: 0.88, backgroundColor: 'rgba(255,255,255,0.07)' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 15,
  },
});
