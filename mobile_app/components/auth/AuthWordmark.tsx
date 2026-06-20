import { StyleSheet, Text, View } from 'react-native';

type Props = {
  compact?: boolean;
};

export function AuthWordmark({ compact = false }: Props) {
  return (
    <View style={compact ? styles.wrapCompact : styles.wrap}>
      <Text style={compact ? styles.textCompact : styles.text}>
        The<Text style={styles.fx}>Fx</Text>Navigators
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  wrapCompact: {
    marginBottom: 16,
  },
  text: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  textCompact: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  fx: {
    fontStyle: 'italic',
    fontWeight: '900',
  },
});
