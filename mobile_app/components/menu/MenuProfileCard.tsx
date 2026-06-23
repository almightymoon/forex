import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CachedImage } from '../CachedImage';
import { AppIcon } from '../AppIcon';
import { GlassCard } from '../GlassCard';
import type { AuthUser } from '../../utils/auth';

type Props = {
  user: AuthUser | null;
  onPress: () => void;
};

export function MenuProfileCard({ user, onPress }: Props) {
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';
  const role = (user?.role ?? 'student').replace(/_/g, ' ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <GlassCard contentStyle={styles.inner} radius={20} prominent>
        <View style={styles.avatarWrap}>
          {user?.profileImage ? (
            <CachedImage source={{ uri: user.profileImage }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{user ? `${user.firstName} ${user.lastName}` : 'Loading…'}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.email ?? ''}</Text>
          <View style={styles.metaRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
            </View>
            <Text style={styles.viewProfile}>View profile</Text>
          </View>
        </View>
        <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.94 },
  inner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,96,230,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(58,173,255,0.35)',
  },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: '#3AADFF' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  email: { fontSize: 12.5, color: 'rgba(255,255,255,0.45)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  roleBadge: {
    backgroundColor: 'rgba(0,96,230,0.22)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.28)',
  },
  roleText: { fontSize: 9, fontWeight: '800', color: '#3AADFF', letterSpacing: 0.6 },
  viewProfile: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
});
