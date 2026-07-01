import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { NormalizedSignal } from '../../utils/normalize';

export type TickerPair = {
  pair: string;
  direction: 'BUY' | 'SELL';
  price: string;
  changePct: number;
};

type Props = {
  signals?: NormalizedSignal[];
  onPress?: () => void;
};

const FALLBACK: TickerPair[] = [
  { pair: 'EUR/USD', direction: 'BUY', price: '1.0921', changePct: 0.18 },
  { pair: 'GBP/USD', direction: 'BUY', price: '1.2734', changePct: 0.34 },
  { pair: 'USD/JPY', direction: 'SELL', price: '151.42', changePct: -0.21 },
  { pair: 'XAU/USD', direction: 'BUY', price: '2334.8', changePct: 0.62 },
  { pair: 'AUD/USD', direction: 'SELL', price: '0.6612', changePct: -0.12 },
  { pair: 'USD/CAD', direction: 'BUY', price: '1.3688', changePct: 0.09 },
];

function pseudoChange(seed: string, direction: 'BUY' | 'SELL') {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 997;
  const mag = (h % 70) / 100 + 0.05; // 0.05–0.75
  return direction === 'BUY' ? mag : -mag;
}

function fromSignals(signals?: NormalizedSignal[]): TickerPair[] {
  if (!signals || signals.length === 0) return FALLBACK;
  const mapped = signals.slice(0, 8).map((s) => ({
    pair: s.pair && s.pair !== '—' ? s.pair : 'FX',
    direction: s.direction,
    price: s.entryPrice && s.entryPrice !== '—' ? s.entryPrice : '—',
    changePct: pseudoChange(s._id || s.pair, s.direction),
  }));
  return mapped.length >= 3 ? mapped : [...mapped, ...FALLBACK].slice(0, 6);
}

function TickerChip({ item }: { item: TickerPair }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const up = item.changePct >= 0;
  return (
    <View style={styles.chip}>
      <View style={[styles.sideDot, { backgroundColor: up ? colors.success : colors.sell }]} />
      <Text style={styles.pair}>{item.pair}</Text>
      <Text style={styles.price}>{item.price}</Text>
      <Text style={[styles.change, { color: up ? colors.success : colors.sell }]}>
        {up ? '+' : ''}
        {item.changePct.toFixed(2)}%
      </Text>
    </View>
  );
}

export function LivePairsTicker({ signals, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const data = useMemo(() => fromSignals(signals), [signals]);
  const [rowWidth, setRowWidth] = useState(0);
  const scroll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rowWidth <= 0) return;
    scroll.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scroll, {
        toValue: -rowWidth,
        duration: Math.max(rowWidth * 22, 6000),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rowWidth, scroll]);

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <View style={styles.liveTag}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>

      <View style={styles.viewport}>
        <Animated.View style={[styles.track, { transform: [{ translateX: scroll }] }]}>
          <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
            {data.map((item, i) => (
              <TickerChip key={`a-${item.pair}-${i}`} item={item} />
            ))}
          </View>
          <View style={styles.row}>
            {data.map((item, i) => (
              <TickerChip key={`b-${item.pair}-${i}`} item={item} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 18,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: '100%',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sell },
  liveText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: colors.sell },
  viewport: { flex: 1, overflow: 'hidden' },
  track: { flexDirection: 'row' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
  sideDot: { width: 6, height: 6, borderRadius: 3 },
  pair: { fontSize: 12, fontWeight: '700', color: colors.text, letterSpacing: 0.2 },
  price: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  change: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
}
