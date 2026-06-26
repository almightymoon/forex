import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { AppIcon, type AppIconName } from '../AppIcon';

export type MenuRowItem = {
  icon: AppIconName;
  label: string;
  subtitle?: string;
  /** @deprecated ignored — menu uses unified monochrome icons */
  color?: string;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  item: MenuRowItem;
};

export function MenuRow({ item }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const destructive = item.destructive === true;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={item.onPress}
    >
      <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
        <AppIcon
          name={item.icon}
          size={18}
          color={destructive ? colors.error : colors.text}
          strokeWidth={2.1}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, destructive && styles.destructiveLabel]}>{item.label}</Text>
        {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>
      {!destructive ? (
        <AppIcon name="chevron-right" size={16} color={colors.textMuted} strokeWidth={2} />
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  pressed: { backgroundColor: colors.surfaceHover },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrapDestructive: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderColor: 'rgba(255,59,48,0.2)',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  destructiveLabel: { color: colors.error },
  subtitle: { fontSize: 12, color: colors.textDim, lineHeight: 16 },
});
}
