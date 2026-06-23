import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CachedImage } from '../CachedImage';
import { AppIcon } from '../AppIcon';
import { colors } from '../../constants/theme';
import { resolveMediaUrl } from '../../utils/normalize';

type Props = {
  onNotifications?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
};

export function HomeHeader({ onNotifications, onSettings, onProfile, profileImage, hasUnread }: Props) {
  const avatarUri = resolveMediaUrl(profileImage);

  return (
    <View style={styles.wrap}>
      <Text style={styles.pageTitle}>Home</Text>

      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onSettings}>
          <AppIcon name="settings" size={20} color={colors.textSilver} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onNotifications}>
          <AppIcon name="notifications" size={20} color={colors.textSilver} strokeWidth={2} />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile}>
          {avatarUri ? (
            <CachedImage source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppIcon name="user" size={18} color={colors.cyan} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
