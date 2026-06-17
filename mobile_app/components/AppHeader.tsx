import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { Logo } from './Logo';
import { colors } from '../constants/theme';
import { resolveMediaUrl } from '../utils/normalize';

type Props = {
  onNotifications?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
  title?: string;
  subtitle?: string;
};

export function AppHeader({ onNotifications, onProfile, profileImage, hasUnread }: Props) {
  const avatarUri = resolveMediaUrl(profileImage);

  return (
    <View style={styles.row}>
      <Logo size="header" />
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onNotifications}>
          <AppIcon name="notifications" size={19} color={colors.textSilver} strokeWidth={2} />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppIcon name="user" size={17} color={colors.cyan} strokeWidth={2.1} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: colors.cyan,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,212,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderCyan,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
