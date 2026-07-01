import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  title: string;
  message: string;
  timestamp?: string;
  accentColor?: string;
  onPress?: () => void;
};

function formatRelative(iso?: string) {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours || 1}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch {
    return '';
  }
}

export function ActivityFeedItem({ title, message, timestamp, accentColor, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedAccent = accentColor ?? colors.blue;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.accent, { backgroundColor: resolvedAccent }]} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.message} numberOfLines={1}>{message}</Text>
      </View>
      {timestamp ? <Text style={styles.time}>{formatRelative(timestamp)}</Text> : null}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.88 },
  accent: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 32,
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSilver,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: colors.textDim,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textDim,
    fontVariant: ['tabular-nums'],
    paddingTop: 2,
  },
});
}
