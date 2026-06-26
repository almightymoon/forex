import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 28;

export function ThemedSwitch({ value, onValueChange, disabled }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const trackColor = value ? colors.primary : isDark ? '#3A3A3C' : '#E9E9EB';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.track,
        { backgroundColor: trackColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.thumbRow,
          value ? styles.thumbRowOn : styles.thumbRowOff,
        ]}
      >
        <View style={styles.thumb} />
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      padding: 2,
      flexShrink: 0,
    },
    thumbRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    thumbRowOff: {
      justifyContent: 'flex-start',
    },
    thumbRowOn: {
      justifyContent: 'flex-end',
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: '#FFFFFF',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2,
      elevation: 2,
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.92,
    },
  });
}
