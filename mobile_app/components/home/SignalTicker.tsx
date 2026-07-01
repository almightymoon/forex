import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { radii } from '../../constants/theme';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  pair: string;
  direction: 'BUY' | 'SELL';
  entry: string;
  onPress?: () => void;
};

export function SignalTicker({ pair, direction, entry, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isBuy = direction === 'BUY';

  return (
    <Pressable style={({ pressed }) => [styles.wrap, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.liveBadge}>
        <View style={styles.pulse} />
        <Text style={styles.liveText}>Live</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.left}>
          <Text style={styles.pair}>{pair}</Text>
          <View style={[styles.sideBadge, isBuy ? styles.buy : styles.sell]}>
            <AppIcon
              name={isBuy ? 'trending-up' : 'trending-down'}
              size={11}
              color={isBuy ? colors.success : colors.sell}
              strokeWidth={2.5}
            />
            <Text style={[styles.sideText, isBuy ? styles.buyText : styles.sellText]}>{direction}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.entry}>{entry}</Text>
          <AppIcon name="chevron-right" size={16} color={colors.textDim} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSolid,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pressed: { opacity: 0.9 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  pulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.success,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minWidth: 0,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pair: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  sideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  buy: { backgroundColor: 'rgba(52,211,153,0.12)' },
  sell: { backgroundColor: 'rgba(255,107,107,0.12)' },
  sideText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  buyText: { color: colors.success },
  sellText: { color: colors.sell },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entry: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSilver,
    fontVariant: ['tabular-nums'],
  },
});
}
