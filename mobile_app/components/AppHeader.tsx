import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from './Logo';
import { resolveMediaUrl } from '../utils/normalize';

type Props = {
  onNotifications?: () => void;
  onProfile?: () => void;
  profileImage?: string;
  hasUnread?: boolean;
  title?: string;
  subtitle?: string;
};

export function AppHeader({ onNotifications, onProfile, profileImage, hasUnread, title, subtitle }: Props) {
  const avatarUri = resolveMediaUrl(profileImage);

  return (
    <View style={styles.row}>
      {title ? (
        <View style={styles.brandWrap}>
          <View style={styles.markWrap}>
            <Logo size="mark" />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : (
        <Logo size="header" />
      )}
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onNotifications}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={onProfile}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={18} color="rgba(255,255,255,0.7)" />
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
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  markWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  brandTextWrap: {
    gap: 1,
    minWidth: 0,
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.92)',
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.35)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3AADFF',
    borderWidth: 1.5,
    borderColor: '#00050A',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(58,173,255,0.4)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
