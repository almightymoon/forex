import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isOnline, subscribeNetwork } from '../utils/network';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    isOnline().then(setOnline);
    return subscribeNetwork(setOnline);
  }, []);

  if (online) return null;

  return (
    <View style={[styles.banner, { top: insets.top + 4 }]} pointerEvents="none">
      <Ionicons name="cloud-offline-outline" size={14} color="#FFC107" />
      <Text style={styles.text}>You&apos;re offline — showing saved data where available</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.28)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFC107',
    lineHeight: 16,
  },
});
