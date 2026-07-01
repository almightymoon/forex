import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Metric = {
  label: string;
  value: number | string;
  highlight?: boolean;
  onPress?: () => void;
};

type Props = {
  metrics: Metric[];
};

export function MetricsPanel({ metrics }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.panel}>
      {metrics.map((m, i) => (
        <Pressable
          key={m.label}
          style={[styles.cell, i > 0 && styles.cellBorder]}
          onPress={m.onPress}
          disabled={!m.onPress}
        >
          <Text style={[styles.value, m.highlight && styles.valueHighlight]}>{m.value}</Text>
          <Text style={styles.label}>{m.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  panel: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: -32,
    marginBottom: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  cellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  valueHighlight: {
    color: colors.success,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});
}
