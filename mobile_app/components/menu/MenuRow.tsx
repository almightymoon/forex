import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';

export type MenuRowItem = {
  icon: AppIconName;
  label: string;
  subtitle?: string;
  color?: string;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  item: MenuRowItem;
};

export function MenuRow({ item }: Props) {
  const accent = item.destructive ? '#FF5A5A' : (item.color ?? '#3AADFF');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={item.onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
        <AppIcon name={item.icon} size={18} color={accent} strokeWidth={2.1} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, item.destructive && styles.destructiveLabel]}>{item.label}</Text>
        {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>
      {!item.destructive ? (
        <AppIcon name="chevron-right" size={16} color="rgba(255,255,255,0.22)" strokeWidth={2} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 15, fontWeight: '600', color: '#fff' },
  destructiveLabel: { color: '#FF5A5A' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 16 },
});
