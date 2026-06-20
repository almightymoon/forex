import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';
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
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <GlassCard contentStyle={styles.emptyInner} radius={20}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.emptyAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
  emptyInner: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyAction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
  },
});
