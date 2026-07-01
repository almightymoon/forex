import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../components/AuthInput';
import { GradientButton } from '../components/GradientButton';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch } from '../utils/api';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) { setError('Invalid or missing reset token. Please request a new reset link.'); return; }
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { message?: string }).message ?? 'Reset failed. The link may have expired.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Pressable style={styles.back} onPress={() => router.replace('/auth')}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.iconWrap}>
              <Ionicons name={done ? 'checkmark-circle' : 'key-outline'} size={48} color={done ? '#4ADE80' : colors.brandBlue} />
            </View>

            <Text style={styles.title}>{done ? 'Password Reset!' : 'Set New Password'}</Text>
            <Text style={styles.subtitle}>
              {done
                ? 'Your password has been reset successfully. You can now log in with your new password.'
                : 'Choose a strong new password for your account.'}
            </Text>

            {!done && !token ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#FF5A5A" />
                <Text style={styles.errorText}>
                  No reset token found. Please tap the link in your email again, or request a new reset link.
                </Text>
              </View>
            ) : null}

            {!done && token ? (
              <>
                <AuthInput
                  label="New Password"
                  icon="lock-closed-outline"
                  placeholder="At least 6 characters"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setError(''); }}
                  rightIcon={showNew ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowNew((p) => !p)}
                />
                <AuthInput
                  label="Confirm New Password"
                  icon="lock-closed-outline"
                  placeholder="Repeat your new password"
                  secureTextEntry={!showConfirm}
                  value={confirm}
                  onChangeText={(v) => { setConfirm(v); setError(''); }}
                  rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowConfirm((p) => !p)}
                />

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#FF5A5A" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <GradientButton title="Reset Password" loading={loading} onPress={handleSubmit} />
              </>
            ) : null}

            <Pressable style={styles.backToLogin} onPress={() => router.replace('/auth')}>
              <Text style={styles.backToLoginText}>
                {done ? 'Go to Login' : 'Back to Login'}
              </Text>
            </Pressable>

            {!token && !done && (
              <Pressable style={styles.forgotLink} onPress={() => router.replace('/forgot-password')}>
                <Text style={styles.forgotLinkText}>Request a new reset link →</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(58,173,255,0.12)', borderWidth: 1, borderColor: 'rgba(58,173,255,0.25)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: 10 },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,90,90,0.1)', borderWidth: 1, borderColor: 'rgba(255,90,90,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, color: '#FF5A5A', lineHeight: 19 },
  backToLogin: { alignItems: 'center', marginTop: 24 },
  backToLoginText: { fontSize: 14, fontWeight: '700', color: colors.brandBlue },
  forgotLink: { alignItems: 'center', marginTop: 12 },
  forgotLinkText: { fontSize: 13, color: colors.textMuted },
});
}
