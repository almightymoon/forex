import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

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
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused, error && styles.inputShellError]}>
        <View style={[styles.inputRow, rightIcon ? styles.inputRowWithRightIcon : null]}>
          {icon ? (
            <Ionicons name={icon} size={17} color="rgba(255,255,255,0.35)" style={styles.leftIcon} />
          ) : null}
          {leftPrefix ?? null}
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.32)"
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
              <Ionicons name={rightIcon} size={19} color="rgba(255,255,255,0.4)" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputShell: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  inputShellFocused: {
    borderColor: 'rgba(3,111,252,0.55)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inputShellError: {
    borderColor: '#F87171',
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
    color: '#FFFFFF',
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
    color: '#F87171',
  },
});
