import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../constants/theme';
import { GlassCard, glassInnerPanel } from './GlassCard';

export type SignalDirection = 'BUY' | 'SELL';
export type SignalStatus = 'active' | 'closed' | 'pending';

export type SignalCardProps = {
  pair: string;
  direction: SignalDirection;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  status?: SignalStatus;
  pips?: string;
  createdAt?: string;
  onPress?: () => void;
  variant?: 'featured' | 'compact';
};

function formatTime(value?: string) {
  if (!value) return '';
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value.trim())) return value;
  try {
    const diff = Date.now() - new Date(value).getTime();
    if (Number.isNaN(diff)) return value;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return value;
  }
}

function formatPair(pair: string) {
  const cleaned = pair.replace(/\s/g, '').toUpperCase();
  if (pair.includes('/')) return pair.replace(/\s/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{3})([A-Z]{3})$/);
  if (match) return `${match[1]}/${match[2]}`;
  return pair.toUpperCase();
}

function formatPips(pips?: string) {
  if (!pips) return '—';
  if (pips.startsWith('+') || pips.startsWith('-')) return pips;
  return `+${pips}`;
}

const STATUS_META: Record<SignalStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: colors.cyan },
  closed: { label: 'Closed', color: colors.textMuted },
  pending: { label: 'Pending', color: colors.gold },
};

export function SignalCard({
  pair,
  direction,
  entry,
  stopLoss,
  takeProfit,
  status = 'active',
  pips,
  createdAt,
  onPress,
  variant = 'compact',
}: SignalCardProps) {
  const isBuy = direction === 'BUY';
  const statusMeta = STATUS_META[status];
  const displayPair = formatPair(pair);
  const pipsDisplay = formatPips(pips);
  const pipsPositive = !pips?.startsWith('-');

  const directionColor = isBuy ? colors.blue : colors.sell;
  const iconColor = isBuy ? colors.cyan : colors.sell;

  const radius = variant === 'featured' ? 30 : 28;
  const cardInnerStyle = [styles.cardInner, variant === 'featured' && styles.cardFeatured];

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <AppIcon
            name={isBuy ? 'trending-up' : 'trending-down'}
            size={22}
            color={iconColor}
            strokeWidth={2.4}
          />
        </View>

        <View style={styles.headerMain}>
          <View style={styles.titleRow}>
            <Text style={[styles.pair, variant === 'featured' && styles.pairFeatured]} numberOfLines={1}>
              {displayPair}
            </Text>
            <View style={[styles.directionPill, { backgroundColor: isBuy ? 'rgba(58,173,255,0.14)' : 'rgba(255,107,107,0.14)' }]}>
              <Text style={[styles.directionText, { color: directionColor }]}>{direction}</Text>
            </View>
          </View>
          <Text style={styles.time}>{formatTime(createdAt)}</Text>
        </View>

        <View style={styles.statusWrap}>
          {status === 'active' ? <View style={styles.statusDot} /> : null}
          <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
        </View>
      </View>

      <View style={styles.tray}>
        <MetricCell label="Entry" value={entry} />
        <MetricCell label="Take Profit" value={takeProfit} tone="tp" />
        <MetricCell label="Stop Loss" value={stopLoss} tone="sl" />
        <MetricCell
          label="Pips"
          value={pipsDisplay}
          tone={pips && pips !== '—' ? (pipsPositive ? 'tp' : 'sl') : 'neutral'}
          last
        />
      </View>
    </>
  );

  const card = (
    <GlassCard
      contentStyle={cardInnerStyle}
      radius={radius}
      prominent={variant === 'featured'}
    >
      {content}
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [pressed && styles.pressed]} onPress={onPress}>
        {card}
      </Pressable>
    );
  }

  return card;
}

function MetricCell({
  label,
  value,
  tone = 'neutral',
  last,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'tp' | 'sl';
  last?: boolean;
}) {
  const valueColor =
    tone === 'tp' ? colors.cyan : tone === 'sl' ? '#FF7A7A' : colors.text;

  return (
    <View style={[styles.metricCell, last && styles.metricCellLast]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 18,
    gap: 16,
  },
  cardFeatured: {
    padding: 20,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#141f38',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  pair: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  pairFeatured: {
    fontSize: 22,
  },
  directionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(148, 163, 184, 0.85)',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingLeft: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tray: {
    flexDirection: 'row',
    ...glassInnerPanel,
    borderRadius: 18,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  metricCellLast: {
    borderRightWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(148, 163, 184, 0.75)',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
