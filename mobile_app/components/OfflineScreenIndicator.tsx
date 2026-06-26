import { useMemo } from 'react';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkOnline } from '../utils/network';

export function OfflineScreenIndicator() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const online = useNetworkOnline();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      style={[styles.overlay, { top: insets.top + 8 }]}
      pointerEvents="none"
      accessibilityLabel="No connection"
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={22} color={colors.gold} />
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
    borderWidth: 1,
  },
});
}
