import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ScreenError({ message = 'Something went wrong.', onRetry }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>Couldn't load data</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Ionicons name="refresh" size={15} color={colors.brandBlue} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 32,
    gap: 10,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  message: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(58,173,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.25)',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandBlue,
  },
});
}
