import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  title: string;
  action?: React.ReactNode;
  onActionPress?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function BrandSectionTitle({
  title,
  action,
  onActionPress,
  actionLabel,
  style,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const trailing =
    action ??
    (onActionPress && actionLabel ? (
      <Pressable onPress={onActionPress} hitSlop={8}>
        <Text style={styles.link}>{actionLabel}</Text>
      </Pressable>
    ) : null);

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {trailing}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      flex: 1,
      minWidth: 0,
    },
    link: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.brandPurple,
    },
  });
}
