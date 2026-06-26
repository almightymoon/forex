import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { AppIcon, type AppIconName } from '../AppIcon';
import { GlassCard } from '../GlassCard';
import { glassSectionLabel } from '../GlassCard';

export type QuickAccessItem = {
  icon: AppIconName;
  label: string;
  /** @deprecated ignored — quick access uses unified monochrome icons */
  color?: string;
  onPress: () => void;
};

type Props = {
  items: QuickAccessItem[];
};

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export function MenuQuickGrid({ items }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows = useMemo(() => chunkPairs(items), [items]);

  return (
    <View style={styles.wrap}>
      <Text style={glassSectionLabel(colors)}>Quick access</Text>
      <GlassCard contentStyle={styles.grid} radius={18}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                onPress={item.onPress}
              >
                <View style={styles.iconWrap}>
                  <AppIcon name={item.icon} size={20} color={colors.text} strokeWidth={2.1} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            {row.length === 1 ? <View style={styles.tileSpacer} pointerEvents="none" /> : null}
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    grid: {
      padding: 12,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    tile: {
      flex: 1,
      minWidth: 0,
      minHeight: 88,
      borderRadius: 14,
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    tileSpacer: {
      flex: 1,
      minWidth: 0,
    },
    tilePressed: { opacity: 0.88, backgroundColor: colors.surface },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tileLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSilver,
      textAlign: 'center',
      lineHeight: 15,
      width: '100%',
    },
  });
}
