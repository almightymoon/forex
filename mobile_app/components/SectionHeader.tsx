import { useMemo } from 'react';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';

type Props = {
  title: string;
  icon?: AppIconName;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, icon, iconColor, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedIconColor = iconColor ?? colors.blue;

  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        {icon ? (
          <View style={[styles.iconBadge, { backgroundColor: `${resolvedIconColor}18` }]}>
            <AppIcon name={icon} size={14} color={resolvedIconColor} strokeWidth={2.25} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <AppIcon name="chevron-right" size={14} color={colors.blue} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },
});
}
