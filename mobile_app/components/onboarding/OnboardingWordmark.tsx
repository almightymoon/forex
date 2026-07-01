import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  compact?: boolean;
};

export function OnboardingWordmark({ compact = false }: Props) {
  const { colors } = useTheme();
  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      <Text style={[compact ? styles.textCompact : styles.text, { color: colors.text }]}>
        The<Text style={styles.fx}>Fx</Text>Navigators
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  wrapCompact: {
    marginBottom: 0,
  },
  text: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  textCompact: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  fx: {
    fontStyle: 'italic',
    fontWeight: '900',
  },
});
