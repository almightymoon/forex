import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type SignalDirection = 'BUY' | 'SELL';

type Props = {
  pair: string;
  direction: SignalDirection;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  status?: 'active' | 'closed' | 'pending';
  pips?: string;
  createdAt?: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: '#4ADE80',
  closed: 'rgba(255,255,255,0.35)',
  pending: '#FFC107',
};

export function SignalCard({ pair, direction, entry, stopLoss, takeProfit, status = 'active', pips, createdAt }: Props) {
  const isBuy = direction === 'BUY';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.pairRow}>
          <Text style={styles.pair}>{pair}</Text>
          <View style={[styles.directionBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
            <Ionicons name={isBuy ? 'trending-up' : 'trending-down'} size={13} color={isBuy ? '#4ADE80' : '#FF5A5A'} />
            <Text style={[styles.directionText, isBuy ? styles.buyText : styles.sellText]}>{direction}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          {pips ? <Text style={[styles.pips, isBuy ? styles.pipsPositive : styles.pipsNegative]}>{pips} pips</Text> : null}
        </View>
      </View>

      {/* Levels */}
      <View style={styles.levels}>
        <LevelItem label="Entry" value={entry} />
        <LevelItem label="Stop Loss" value={stopLoss} accent="#FF5A5A" />
        <LevelItem label="Take Profit" value={takeProfit} accent="#4ADE80" />
      </View>

      {createdAt ? <Text style={styles.date}>{createdAt}</Text> : null}
    </View>
  );
}

function LevelItem({ label, value, accent = '#fff' }: { label: string; value: string; accent?: string }) {
  return (
    <View style={levelStyles.item}>
      <Text style={levelStyles.label}>{label}</Text>
      <Text style={[levelStyles.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const levelStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  value: { fontSize: 13.5, fontWeight: '700' },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pair: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  buyBadge: { backgroundColor: 'rgba(74,222,128,0.12)' },
  sellBadge: { backgroundColor: 'rgba(255,90,90,0.12)' },
  directionText: { fontSize: 12, fontWeight: '700' },
  buyText: { color: '#4ADE80' },
  sellText: { color: '#FF5A5A' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pips: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  pipsPositive: { color: '#4ADE80' },
  pipsNegative: { color: '#FF5A5A' },
  levels: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
});
