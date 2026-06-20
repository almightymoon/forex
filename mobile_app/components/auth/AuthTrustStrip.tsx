import { View, Text, StyleSheet } from 'react-native';
import { authTheme } from './authTheme';

type Props = {
  primary: string;
  secondary: string;
};

export function AuthTrustStrip({ primary, secondary }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <View style={styles.content}>
        <Text style={styles.primary}>{primary}</Text>
        <Text style={styles.secondary}>{secondary}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: authTheme.border,
  },
  content: {
    alignItems: 'center',
    maxWidth: '72%',
  },
  primary: {
    fontSize: 11,
    fontWeight: '700',
    color: authTheme.textSoft,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  secondary: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: authTheme.textDim,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
