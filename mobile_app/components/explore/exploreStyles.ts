import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/theme';

export function createExploreChipStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chipTextActive: {
      color: colors.primaryForeground,
      fontWeight: '700',
    },
    chipCount: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textDim,
    },
    chipCountActive: {
      color: colors.primaryForeground,
      opacity: 0.8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 10,
      paddingHorizontal: 2,
    },
  });
}
