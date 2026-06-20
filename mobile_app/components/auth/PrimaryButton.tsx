import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '../../constants/theme';

const PRIMARY = colors.primary;

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, loading = false, disabled, style, ...props }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.wrapper, isDisabled && styles.disabled, style]}
      disabled={isDisabled}
      {...props}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 28 : 48}
        tint="dark"
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[
          'rgba(3,111,252,0.88)',
          'rgba(3,111,252,0.68)',
          'rgba(2,83,189,0.78)',
        ]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.fill}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  fill: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.25,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});
