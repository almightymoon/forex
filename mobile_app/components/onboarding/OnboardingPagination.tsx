import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  count: number;
  activeIndex: number;
};

export function OnboardingPagination({ count, activeIndex }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 20,
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    dotActive: {
      width: 28,
      backgroundColor: colors.primary,
    },
    dotInactive: {
      width: 6,
      backgroundColor: colors.border,
    },
  });
}
