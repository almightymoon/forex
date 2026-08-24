import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Logo } from './Logo';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { resolveMediaUrl } from '../utils/normalize';

type Props = {
  onNotifications?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
  unreadCount?: number;
  title?: string;
  subtitle?: string;
};

export function AppHeader({ onNotifications, onProfile, profileImage, hasUnread, unreadCount = 0 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const avatarUri = resolveMediaUrl(profileImage);
  const badgeCount = unreadCount > 0 ? unreadCount : hasUnread ? 1 : 0;
  const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);

  return (
    <View style={styles.row}>
      <Logo size="header" />
      <View style={styles.actions}>
        <Pressable
          style={styles.iconBtn}
          onPress={onNotifications}
          accessibilityLabel={
            badgeCount > 0 ? `Notifications, ${badgeCount} unread` : 'Notifications'
          }
        >
          <AppIcon name="notifications" size={19} color={colors.textSilver} strokeWidth={2} />
          {badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppIcon name="user" size={17} color={colors.text} strokeWidth={2.1} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandPurpleDeep,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.brandPurpleDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
}
