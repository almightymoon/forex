import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../constants/theme';
import { lightColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { AppIcon, type AppIconName } from './AppIcon';
import { GlassCard } from './GlassCard';

type Props = {
  icon: AppIconName;
  label: string;
  color?: string;
  onPress?: () => void;
};

export function QuickAccessCard({ icon, label, color = lightColors.brandBlue, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={({ pressed }) => [styles.flex, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard contentStyle={styles.cardInner} radius={16} style={styles.flex}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}14`, borderColor: `${color}28` }]}>
          <AppIcon name={icon} size={22} color={color} strokeWidth={2.1} />
        </View>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </GlassCard>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  cardInner: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 10,
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
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
}
