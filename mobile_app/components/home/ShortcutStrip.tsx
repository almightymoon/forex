import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';
import { radii } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export type ShortcutItem = {
  id: string;
  icon: AppIconName;
  label: string;
  accent?: boolean;
  onPress: () => void;
};

type Props = {
  items: ShortcutItem[];
};

export function ShortcutStrip({ items }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Quick actions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={item.onPress}
          >
            <View style={[styles.icon, item.accent && styles.iconAccent]}>
              <AppIcon
                name={item.icon}
                size={22}
                color={item.accent ? colors.cyan : colors.textSilver}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { marginBottom: 24, gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 4,
  },
  item: {
    alignItems: 'center',
    width: 64,
    gap: 8,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAccent: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderColor: colors.borderCyan,
  },
  itemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
}
