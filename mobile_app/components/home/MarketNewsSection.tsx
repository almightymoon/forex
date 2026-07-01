import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { NormalizedNews } from '../../utils/normalize';
import { BrandSectionTitle } from './BrandSectionTitle';
import { HomeNewsCard } from './HomeNewsCard';

type Props = {
  items: NormalizedNews[];
  onPressArticle?: (item: NormalizedNews) => void;
  onViewAll?: () => void;
};

export function MarketNewsSection({ items, onPressArticle, onViewAll }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const visible = items.slice(0, 2);

  return (
    <View style={styles.wrap}>
      <BrandSectionTitle title="Market News" actionLabel="View All" onActionPress={onViewAll} />

      {visible.length > 0 ? (
        visible.map((item, index) => (
          <HomeNewsCard
            key={`${item.id}-${item.url}-${index}`}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 24,
    },
    empty: {
      borderRadius: 20,
      backgroundColor: colors.surfaceHover,
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
}
