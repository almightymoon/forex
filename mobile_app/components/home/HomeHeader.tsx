import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CachedImage } from '../CachedImage';
import { AppIcon } from '../AppIcon';
import type { AppColors } from '../../constants/theme';
import { greetingForNow } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveMediaUrl } from '../../utils/normalize';

type Props = {
  firstName?: string;
  onNotifications?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
  /** Unread count shown as a badge on the bell (preferred over hasUnread alone). */
  unreadCount?: number;
};

export function HomeHeader({
  firstName,
  onNotifications,
  onSettings,
  onProfile,
  profileImage,
  hasUnread,
  unreadCount = 0,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const avatarUri = resolveMediaUrl(profileImage);
  const badgeCount = unreadCount > 0 ? unreadCount : hasUnread ? 1 : 0;
  const badgeLabel = badgeCount > 99 ? '99+' : String(badgeCount);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleBlock}>
        <Text style={styles.pageTitle} accessibilityRole="header">
          Home
        </Text>
        {firstName ? (
          <Text style={styles.greeting}>
            {greetingForNow()},{' '}
            <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onSettings} accessibilityLabel="Settings">
          <AppIcon name="settings" size={20} color={colors.textSilver} strokeWidth={2} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={onNotifications}
          accessibilityLabel={
            badgeCount > 0 ? `Notifications, ${badgeCount} unread` : 'Notifications'
          }
        >
          <AppIcon name="notifications" size={20} color={colors.textSilver} strokeWidth={2} />
          {badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile} accessibilityLabel="Profile">
          {avatarUri ? (
            <CachedImage source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppIcon name="user" size={18} color={colors.brandPurple} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
      paddingBottom: 16,
      marginBottom: 8,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    pageTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    greeting: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
    },
    greetingName: {
      color: colors.brandPurple,
      fontWeight: '700',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    dot: {
      position: 'absolute',
      top: 10,
      right: 11,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brandPurple,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.brandPurple,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.surfaceHover,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 12,
    },
    avatarBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceHover,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
  });
}
