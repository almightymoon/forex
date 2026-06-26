import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassCard } from './GlassCard';
import { MiniSignalChart } from './MiniSignalChart';

type Props = {
  pair?: string;
  direction?: 'BUY' | 'SELL';
  entry?: string;
  takeProfit?: string;
  stopLoss?: string;
  hasSignal?: boolean;
  onPress?: () => void;
};

function formatPrice(value?: string) {
  if (!value || value === '—') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export function ActiveSignalsHomeCard({
  pair,
  direction,
  entry = '—',
  takeProfit = '—',
  stopLoss = '—',
  hasSignal = false,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isBuy = direction !== 'SELL';

  return (
    <Pressable style={({ pressed }) => [styles.flex, pressed && styles.pressed]} onPress={onPress}>
      <GlassCard style={styles.card} contentStyle={styles.inner} radius={20}>
        <Text style={styles.title}>Live Signals</Text>

        {hasSignal ? (
          <>
            <View style={styles.pairRow}>
              <Text style={styles.pair} numberOfLines={1}>
                {pair ?? '—'}
              </Text>
              {direction ? (
                <View style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
                  <Text style={[styles.badgeText, isBuy ? styles.badgeTextBuy : styles.badgeTextSell]}>
                    {direction}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.chartSlot}>
              <MiniSignalChart />
            </View>
            <View style={styles.metrics}>
              <Metric label="Entry" value={formatPrice(entry)} tone="neutral" />
              <Metric label="TP" value={formatPrice(takeProfit)} tone="profit" />
              <Metric label="SL" value={formatPrice(stopLoss)} tone="loss" />
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No active signals</Text>
            <Text style={styles.emptySub}>Check the signals desk for updates</Text>
          </View>
        )}
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const valueColor =
    tone === 'profit' ? colors.brandBlue : tone === 'loss' ? colors.sell : colors.text;

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    pressed: { opacity: 0.92 },
    card: { flex: 1, minWidth: 0 },
    inner: {
      padding: 14,
      minHeight: 208,
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
      marginBottom: 4,
    },
    pairRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    pair: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeBuy: {
      backgroundColor: `${colors.brandBlue}22`,
    },
    badgeSell: {
      backgroundColor: `${colors.sell}22`,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    badgeTextBuy: {
      color: colors.brandBlue,
    },
    badgeTextSell: {
      color: colors.sell,
    },
    chartSlot: {
      flex: 1,
      justifyContent: 'center',
      minHeight: 56,
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
      color: colors.textSecondary,
      fontWeight: '500',
    },
    metricValue: {
      fontSize: 12,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 4,
    },
    emptyTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 15,
    },
  });
}
