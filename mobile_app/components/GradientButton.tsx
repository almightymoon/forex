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
import { colors, gradients } from '../constants/theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
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
  const isDisabled = disabled || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        style={[styles.ghostButton, isDisabled && styles.disabled, style]}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ghostText}>{title}</Text>
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
        colors={[...gradients.button]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.indigoDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  wrapperMargin: {
    marginTop: 6,
  },
  gradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ghostButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghostText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  disabled: {
    opacity: 0.45,
  },
});
