import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkOnline } from '../utils/network';

export function OfflineScreenIndicator() {
  const online = useNetworkOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      style={[styles.overlay, { top: insets.top + 8 }]}
      pointerEvents="none"
      accessibilityLabel="No connection"
    >
      <View style={styles.badge}>
        <Ionicons name="cloud-offline-outline" size={22} color="#FFC107" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
});
