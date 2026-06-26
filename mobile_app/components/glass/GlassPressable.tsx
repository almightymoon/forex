import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from '../GlassCard';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  prominent?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

/** Pressable wrapper around a glass card */
export function GlassPressable({
  children,
  style,
  contentStyle,
  radius,
  prominent,
  onPress,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createPressableStyles(), []);

  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.pressed, style]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <GlassCard contentStyle={contentStyle} radius={radius} prominent={prominent}>
        {children}
      </GlassCard>
    </Pressable>
  );
}

export function GlassEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = 'search-outline',
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <GlassCard contentStyle={styles.emptyInner} radius={22}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.emptyActionBtn} onPress={onAction} hitSlop={8}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primaryForeground} />
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

function createPressableStyles() {
  return StyleSheet.create({
    pressed: {
      opacity: 0.92,
    },
  });
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    emptyInner: {
      padding: 32,
      alignItems: 'center',
      gap: 8,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167,139,250,0.22)' : colors.border,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    emptyMessage: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 21,
      maxWidth: 280,
    },
    emptyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    emptyActionText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryForeground,
    },
  });
}
