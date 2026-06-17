import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { Logo } from '../Logo';
import { colors } from '../../constants/theme';
import { resolveMediaUrl } from '../../utils/normalize';

type Props = {
  onNotifications?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
};

export function HomeHeader({ onNotifications, onProfile, profileImage, hasUnread }: Props) {
  const avatarUri = resolveMediaUrl(profileImage);

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Logo size="brand" />
        <View style={styles.brandText}>
          <Text style={styles.title} numberOfLines={1}>FX Navigators</Text>
          <Text style={styles.subtitle} numberOfLines={1}>Trading Academy</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onNotifications}>
          <AppIcon name="notifications" size={18} color={colors.textSilver} strokeWidth={2} />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <AppIcon name="user" size={17} color={colors.cyan} strokeWidth={2} />
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
    marginBottom: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  brandText: { flex: 1, minWidth: 0, gap: 1 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cyan,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f1728',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
    borderWidth: 1.5,
    borderColor: '#0f1728',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f1728',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
