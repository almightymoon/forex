import { StyleSheet, View } from 'react-native';
import { AuthWordmark } from './AuthWordmark';

/** Wordmark row for auth screens */
export function AuthTopBar() {
  return (
    <View style={styles.row}>
      <AuthWordmark compact />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 24,
  },
});
