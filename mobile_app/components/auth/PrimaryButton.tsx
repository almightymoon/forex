import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, loading = false, disabled, style, ...props }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.wrapper, isDisabled && styles.disabled, style]}
      disabled={isDisabled}
      {...props}
    >
      <View style={styles.fill}>
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    shadowColor: colors.brandPurpleDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  fill: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryForeground,
    letterSpacing: -0.2,
  },
  disabled: {
    opacity: 0.45,
  },
});
}
