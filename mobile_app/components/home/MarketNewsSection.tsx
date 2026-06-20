import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import type { NormalizedNews } from '../../utils/normalize';
import { HomeNewsCard } from './HomeNewsCard';

type Props = {
  items: NormalizedNews[];
  onPressArticle?: (item: NormalizedNews) => void;
  onViewAll?: () => void;
};

export function MarketNewsSection({ items, onPressArticle, onViewAll }: Props) {
  const visible = items.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Market News</Text>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        ) : null}
      </View>

      {visible.length > 0 ? (
        visible.map((item) => (
          <HomeNewsCard
            key={item.id}
            item={item}
            onPress={() => onPressArticle?.(item)}
          />
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No market news available right now</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  empty: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
