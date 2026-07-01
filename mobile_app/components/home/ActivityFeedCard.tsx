import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '../AppIcon';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  title: string;
  message: string;
  author?: string;
  role?: string;
  timestamp?: string;
  icon?: AppIconName;
  iconColor?: string;
  onPress?: () => void;
};

function formatAgo(iso?: string) {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return '';
  }
}

export function ActivityFeedCard({
  title,
  message,
  author = 'FX Navigators',
  role = 'Team',
  timestamp,
  icon = 'activity',
  iconColor,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedIconColor = iconColor ?? colors.blue;

  const initials = author.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={styles.authorMeta}>
            <Text style={styles.author}>{author}</Text>
            <Text style={styles.meta}>{role} · {formatAgo(timestamp)}</Text>
          </View>
        </View>
        <View style={[styles.typeIcon, { backgroundColor: `${resolvedIconColor}18` }]}>
          <AppIcon name={icon} size={16} color={resolvedIconColor} strokeWidth={2} />
        </View>
      </View>
      <Text style={styles.feedTitle}>{title}</Text>
      {message ? <Text style={styles.message} numberOfLines={2}>{message}</Text> : null}
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  pressed: { opacity: 0.92 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(58,173,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.cyan,
  },
  authorMeta: { flex: 1, minWidth: 0 },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
}
