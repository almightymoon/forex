import { Ionicons } from '@expo/vector-icons';
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
  /** Rendered to the right of the left icon, before the text input (e.g. phone flag) */
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
  ...props
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {icon ? (
          <Ionicons name={icon} size={16} color="rgba(255,255,255,0.4)" style={styles.leftIcon} />
        ) : null}
        {leftPrefix ?? null}
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.28)"
          style={[styles.input, style]}
          {...props}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 13,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(8, 20, 48, 0.82)',
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: '#FF5A5A',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
  error: {
    marginTop: 5,
    fontSize: 12,
    color: '#FF5A5A',
  },
});
