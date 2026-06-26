import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CachedImage } from '../CachedImage';
import { AppIcon } from '../AppIcon';
import { GlassCard } from '../GlassCard';
import type { AuthUser } from '../../utils/auth';

type Props = {
  user: AuthUser | null;
  onPress: () => void;
};

export function MenuProfileCard({ user, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';
  const role = (user?.role ?? 'student').replace(/_/g, ' ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <GlassCard contentStyle={styles.inner} radius={18} prominent>
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
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {user ? `${user.firstName} ${user.lastName}` : 'Loading…'}
          </Text>
          <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
            {user?.email ?? ''}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText} numberOfLines={1} ellipsizeMode="tail">
              {role.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.chevronWrap}>
          <AppIcon name="chevron-right" size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const AVATAR = 50;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  pressable: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  pressed: { opacity: 0.94 },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    flexShrink: 0,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitials: { fontSize: 18, fontWeight: '800', color: colors.text },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  email: {
    fontSize: 12,
    color: colors.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  chevronWrap: {
    flexShrink: 0,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}
