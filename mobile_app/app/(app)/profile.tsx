import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/GlassCard';
import { GlassSurface } from '../../components/glass/GlassSurface';
import { apiFetch, apiUpload } from '../../utils/api';
import { AuthUser, getStoredUser, storeAuth, getStoredToken } from '../../utils/auth';
import { resolveMediaUrl } from '../../utils/normalize';
import { primaryButtonGradient } from '../../utils/primaryButton';

type Field = { label: string; key: keyof EditForm; placeholder: string; keyboard?: 'default' | 'phone-pad' };

interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
}

const FIELDS: Field[] = [
  { label: 'First Name', key: 'firstName', placeholder: 'Enter first name' },
  { label: 'Last Name', key: 'lastName', placeholder: 'Enter last name' },
  { label: 'Phone', key: 'phone', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
  { label: 'Country', key: 'country', placeholder: 'e.g. United Kingdom' },
];

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const saveGradientColors = useMemo(() => primaryButtonGradient(isDark), [isDark]);
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);
  const rowStyles = useMemo(() => createRowStyles(colors), [colors]);
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<EditForm>({ firstName: '', lastName: '', phone: '', country: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      const [stored, res] = await Promise.all([getStoredUser(), apiFetch('api/users/profile/me')]);
      setUser(stored);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          firstName: String(data.firstName ?? stored?.firstName ?? ''),
          lastName: String(data.lastName ?? stored?.lastName ?? ''),
          phone: String(data.phone ?? ''),
          country: String(data.country ?? ''),
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const uploadProfileImage = async (uri: string, mimeType = 'image/jpeg') => {
    setUploadingAvatar(true);
    setError('');
    try {
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: `avatar.${ext}`,
        type: mimeType,
      } as unknown as Blob);

      const res = await apiUpload('api/users/profile/me/profile-image', formData);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to update profile picture.');
        return false;
      }

      const updatedUser = (data as { user?: Record<string, unknown> }).user;
      const newImage = (data as { profileImage?: string }).profileImage
        ?? (updatedUser?.profileImage as string | undefined);

      if (newImage) {
        setProfile((p) => ({ ...p, profileImage: newImage }));
        if (user) {
          const token = await getStoredToken();
          if (token) {
            await storeAuth(token, { ...user, profileImage: newImage });
            setUser((prev) => prev ? { ...prev, profileImage: newImage } : prev);
          }
        }
      }

      setLocalAvatarUri(null);
      setSuccess('Profile picture updated!');
      toast('Profile picture updated!');
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickProfileImage = async () => {
    if (!editing || uploadingAvatar) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to change your profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    setLocalAvatarUri(asset.uri);
    await uploadProfileImage(asset.uri, asset.mimeType ?? 'image/jpeg');
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('api/users/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.user ?? data;
        // Persist name changes to stored user
        if (user) {
          const token = await getStoredToken();
          await storeAuth(token!, {
            ...user,
            firstName: updated.firstName ?? user.firstName,
            lastName: updated.lastName ?? user.lastName,
          });
          setUser((prev) => prev ? { ...prev, firstName: updated.firstName ?? prev.firstName, lastName: updated.lastName ?? prev.lastName } : prev);
        }
        setProfile((p) => ({ ...p, ...updated }));
        setSuccess('Profile updated!');
        setEditing(false);
        toast('Profile updated!');
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { message?: string }).message ?? 'Update failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyReferralCode = () => {
    const code = profile.referralCode as string | undefined;
    if (!code) return;
    // Clipboard is not available in Expo Go without install; use Share instead
    Linking.openURL(`https://thefxnavigators.com?ref=${code}`);
    toast('Referral link opened!');
  };

  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName}`
    : user ? `${user.firstName} ${user.lastName}` : '—';
  const email = (profile.email as string) ?? user?.email ?? '';
  const role = (profile.role as string) ?? user?.role ?? 'student';
  const avatarUrl = resolveMediaUrl(
    (localAvatarUri ?? profile.profileImage) as string | undefined,
  );
  const initials = `${(profile.firstName as string | undefined)?.[0] ?? user?.firstName?.[0] ?? '?'}${(profile.lastName as string | undefined)?.[0] ?? user?.lastName?.[0] ?? ''}`;

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>My Profile</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <ActivityIndicator color={colors.black} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable
            style={[styles.editBtn, editing && styles.editBtnActive]}
            onPress={() => {
              if (editing) setLocalAvatarUri(null);
              setEditing((e) => !e);
              setError('');
              setSuccess('');
            }}
          >
            <Ionicons name={editing ? 'close' : 'pencil'} size={16} color={editing ? colors.error : colors.text} />
            <Text style={[styles.editBtnText, editing && { color: '#FF5A5A' }]}>
              {editing ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero avatar */}
          <GlassSurface style={styles.heroBanner} contentStyle={styles.heroInner} radius={20} prominent>
            <Pressable
              style={styles.avatarWrap}
              onPress={pickProfileImage}
              disabled={!editing || uploadingAvatar}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.initials}>{initials.toUpperCase()}</Text>
                </View>
              )}
              {editing && (
                <View style={styles.cameraBadge}>
                  {uploadingAvatar
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Ionicons name="camera" size={14} color={colors.primaryForeground} />}
                </View>
              )}
            </Pressable>
            <Text style={styles.heroName} numberOfLines={2}>{displayName}</Text>
            <Text style={styles.heroEmail} numberOfLines={1} ellipsizeMode="middle">{email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.text} />
              <Text style={styles.roleText}>{role.toUpperCase()}</Text>
            </View>
          </GlassSurface>

          {/* Edit form or info view */}
          {editing ? (
            <GlassSurface style={styles.formCard} contentStyle={styles.formInner} radius={18}>
              <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
              {FIELDS.map((f) => (
                <View key={f.key} style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textDim}
                    keyboardType={f.keyboard ?? 'default'}
                  />
                </View>
              ))}

              {error ? (
                <View style={styles.alertBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#FF5A5A" />
                  <Text style={styles.alertText}>{error}</Text>
                </View>
              ) : null}
              {success ? (
                <View style={[styles.alertBox, styles.successBox]}>
                  <Ionicons name="checkmark-circle" size={15} color="#4ADE80" />
                  <Text style={[styles.alertText, { color: '#4ADE80' }]}>{success}</Text>
                </View>
              ) : null}

              <LinearGradient colors={saveGradientColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.saveGradient}>
                <Pressable style={styles.savePress} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <>
                        <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                        <Text style={styles.saveText}>Save Changes</Text>
                      </>}
                </Pressable>
              </LinearGradient>
            </GlassSurface>
          ) : (
            <>
              {/* Info rows */}
              <GlassSurface style={styles.infoCard} contentStyle={styles.infoInner} radius={18}>
                <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
                <InfoRow icon="person-outline" label="Full Name" value={displayName} />
                <InfoRow icon="mail-outline" label="Email" value={email} />
                {profile.phone ? <InfoRow icon="call-outline" label="Phone" value={profile.phone as string} /> : null}
                {profile.country ? <InfoRow icon="globe-outline" label="Country" value={profile.country as string} /> : null}
              </GlassSurface>

              {/* Referral */}
              {profile.referralCode ? (
                <GlassSurface style={styles.infoCard} contentStyle={styles.infoInner} radius={18}>
                  <Text style={styles.sectionLabel}>REFERRAL</Text>
                  <Pressable style={styles.referralRow} onPress={copyReferralCode}>
                    <View style={styles.referralIcon}>
                      <Ionicons name="share-social-outline" size={18} color="#FFC107" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Your Referral Code</Text>
                      <Text style={styles.referralCode}>{profile.referralCode as string}</Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                </GlassSurface>
              ) : null}

              {/* Stats */}
              {(profile.balance != null || profile.rank) ? (
                <View style={styles.statsRow}>
                  {profile.balance != null ? (
                    <StatCard icon="wallet-outline" label="Balance" value={`${profile.balance} USDT`} color="#4ADE80" />
                  ) : null}
                  {profile.rank ? (
                    <StatCard icon="ribbon-outline" label="Rank" value={profile.rank as string} color="#E879F9" />
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  const rowStyles = useMemo(() => createRowStyles(colors), [colors]);

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon} size={17} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {  const { colors } = useTheme();
  const statStyles = useMemo(() => createStatStyles(colors), [colors]);

  return (
    <GlassCard style={statStyles.flex} contentStyle={statStyles.inner} radius={14}>
      <View style={[statStyles.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </GlassCard>
  );
}

function createRowStyles(colors: AppColors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label: { fontSize: 11, color: colors.textDim, marginBottom: 2, fontWeight: '500' },
  value: { fontSize: 14.5, fontWeight: '600', color: colors.text },
});
}

function createStatStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inner: { padding: 12, alignItems: 'flex-start', gap: 6 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
});
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
  },
  editBtnActive: { borderColor: 'rgba(255,90,90,0.4)', backgroundColor: 'rgba(255,90,90,0.08)' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 40, gap: 16 },
  heroBanner: {},
  heroInner: {
    padding: 22,
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.border,
  },
  initials: { fontSize: 26, fontWeight: '900', color: colors.text },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
    maxWidth: '100%',
  },
  heroEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.border,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  infoCard: {},
  infoInner: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.2,
    color: colors.textDim, marginBottom: 4, textTransform: 'uppercase',
  },
  referralRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  referralIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,193,7,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  referralCode: { fontSize: 16, fontWeight: '800', color: '#FFC107', letterSpacing: 1 },
  formCard: {},
  formInner: { padding: 18, gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  input: {
    backgroundColor: colors.surfaceHover, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 46, fontSize: 14.5, color: colors.text,
  },
  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 10,
    padding: 12,
  },
  successBox: { backgroundColor: 'rgba(74,222,128,0.1)' },
  alertText: { flex: 1, fontSize: 13, color: '#FF5A5A' },
  saveGradient: { borderRadius: 13, overflow: 'hidden' },
  savePress: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { fontSize: 15, fontWeight: '800', color: colors.primaryForeground },
});
}
