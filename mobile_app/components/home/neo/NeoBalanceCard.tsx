import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

type Props = {
  /** Primary stat — e.g. average learning progress or active signal count */
  value: string;
  label?: string;
  onPrimaryAction?: () => void;
  actionLabel?: string;
};

export function NeoBalanceCard({
  value,
  label = 'Your progress',
  onPrimaryAction,
  actionLabel = 'Continue learning',
}: Props) {
  const { colors, neo, isDark } = useTheme();
  const styles = useMemo(() => createStyles(neo, colors, isDark), [neo, colors, isDark]);
  const [hidden, setHidden] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={neo.inkMuted} />
        </Pressable>
      </View>

      <Text style={styles.value}>{hidden ? '••••••' : value}</Text>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={onPrimaryAction}
      >
        <Text style={styles.ctaText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(
  neo: ReturnType<typeof import('../../../constants/theme').createNeo>,
  colors: import('../../../constants/theme').AppColors,
  isDark: boolean,
) {
  return StyleSheet.create({
    card: {
      backgroundColor: neo.card,
      borderRadius: neo.radiusLg,
      padding: 22,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: neo.border,
      shadowColor: neo.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.45 : 0.05,
      shadowRadius: 16,
      elevation: 3,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: neo.inkMuted,
    },
    eyeBtn: {
      padding: 4,
    },
    value: {
      fontSize: 40,
      fontWeight: '800',
      color: neo.ink,
      letterSpacing: -1.2,
      marginBottom: 22,
      fontVariant: ['tabular-nums'],
    },
    cta: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaPressed: { opacity: 0.88 },
    ctaText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryForeground,
      letterSpacing: -0.2,
    },
  });
}
