import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import { GlassCard } from './GlassCard';
import { MiniSignalChart } from './MiniSignalChart';

type Props = {
  entry?: string;
  takeProfit?: string;
  stopLoss?: string;
  onPress?: () => void;
};

export function ActiveSignalsHomeCard({
  entry = '—',
  takeProfit = '—',
  stopLoss = '—',
  onPress,
}: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.flex, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard style={styles.card} contentStyle={styles.inner} radius={20}>
        <Text style={styles.title}>Active Signals Right Now.</Text>
        <View style={styles.chartSlot}>
          <MiniSignalChart />
        </View>
        <View style={styles.metrics}>
          <Metric label="Entry" value={entry} tone="neutral" />
          <Metric label="Take Profit" value={takeProfit} tone="profit" />
          <Metric label="Stop Loss" value={stopLoss} tone="loss" />
        </View>
      </GlassCard>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'profit' | 'loss';
}) {
  const valueColor =
    tone === 'profit' ? colors.success : tone === 'loss' ? colors.sell : colors.text;

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.92 },
  card: { flex: 1, minWidth: 0 },
  inner: {
    padding: 14,
    minHeight: 208,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  chartSlot: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 72,
  },
  metrics: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.58)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
