import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = TextInputProps & {
  label: string;
  icon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  leftPrefix?: React.ReactNode;
  error?: string;
};

export function AuthInput({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  leftPrefix,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused, error && styles.inputShellError]}>
        <View style={[styles.inputRow, rightIcon ? styles.inputRowWithRightIcon : null]}>
          {icon ? (
            <Ionicons name={icon} size={17} color={colors.textMuted} style={styles.leftIcon} />
          ) : null}
          {leftPrefix ?? null}
          <TextInput
            placeholderTextColor={colors.textDim}
            style={[styles.input, style]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon ? (
            <Pressable onPress={onRightIconPress} hitSlop={12} style={styles.rightIcon}>
              <Ionicons name={rightIcon} size={19} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputShell: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9F9F9',
  },
  inputShellFocused: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  inputShellError: {
    borderColor: colors.error,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
  },
  inputRowWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  rightIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.error,
  },
});
}
