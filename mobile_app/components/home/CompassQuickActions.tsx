import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticLight } from '../../utils/haptics';

export type QuickAction = {
  id: string;
  icon: AppIconName;
  label: string;
  tint: string;
  onPress: () => void;
};

type Props = {
  actions: QuickAction[];
};

function ActionTile({ action }: { action: QuickAction }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={() => {
        void hapticLight();
        action.onPress();
      }}
    >
      <LinearGradient
        colors={[`${action.tint}26`, 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tileBg}
      >
        <View style={[styles.iconHalo, { borderColor: `${action.tint}59`, backgroundColor: `${action.tint}1f` }]}>
          <AppIcon name={action.icon} size={21} color={action.tint} strokeWidth={2.1} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {action.label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function CompassQuickActions({ actions }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <ActionTile key={a.id} action={a} />
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  tile: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  tileBg: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconHalo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.textSilver, letterSpacing: 0.1 },
});
}
