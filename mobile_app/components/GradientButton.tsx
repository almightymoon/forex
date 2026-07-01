import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'portal';
  style?: StyleProp<ViewStyle>;
  noMargin?: boolean;
};

export function GradientButton({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  noMargin = false,
  ...props
}: Props) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gradientColors = useMemo(
    () => [...gradients.button] as [string, string, ...string[]],
    [gradients.button],
  );

  const isDisabled = disabled || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        style={[styles.ghostButton, isDisabled && styles.disabled, style]}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.ghostText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  if (variant === 'portal') {
    return (
      <Pressable
        style={[styles.portalButton, !noMargin && styles.wrapperMargin, isDisabled && styles.disabled, style]}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.portalText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.wrapper, !noMargin && styles.wrapperMargin, isDisabled && styles.disabled, style]}
      disabled={isDisabled}
      {...props}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrapper: {
      borderRadius: 999,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    wrapperMargin: {
      marginTop: 6,
    },
    gradient: {
      height: 52,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryForeground,
      letterSpacing: -0.2,
    },
    ghostButton: {
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    ghostText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    portalButton: {
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    portalText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    disabled: {
      opacity: 0.45,
    },
  });
}
