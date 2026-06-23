import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GlassCard } from '../GlassCard';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  onPress?: () => void;
  disabled?: boolean;
};

/** Standard list / form panel with frosted glass */
export function GlassListCard({
  children,
  style,
  contentStyle,
  radius = 18,
  onPress,
  disabled,
}: Props) {
  const card = (
    <GlassCard style={style} contentStyle={contentStyle} radius={radius}>
      {children}
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
});
