import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  compact?: boolean;
};

export function AuthWordmark({ compact = false }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      <Text style={compact ? styles.textCompact : styles.text}>
        The<Text style={styles.fx}>Fx</Text>Navigators
      </Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  wrapCompact: {
    marginBottom: 16,
  },
  text: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  textCompact: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  fx: {
    fontStyle: 'italic',
    fontWeight: '900',
  },
});
}
