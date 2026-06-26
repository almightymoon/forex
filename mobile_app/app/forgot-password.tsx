import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? 'Something went wrong. Please try again.');
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
            {/* Back button */}
            <Pressable style={styles.back} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.iconWrap}>
              <Ionicons name="lock-open-outline" size={48} color={colors.brandBlue} />
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            {sent ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={28} color="#4ADE80" />
                <Text style={styles.successText}>
                  Reset link sent! Check your inbox and follow the instructions.
                </Text>
              </View>
            ) : (
              <>
                <AuthInput
                  label="Email Address"
                  icon="mail-outline"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  error={error}
                />
                <GradientButton title="Send Reset Link" loading={loading} onPress={handleSubmit} />
              </>
            )}

            <Pressable style={styles.backToLogin} onPress={() => router.replace('/auth')}>
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </Pressable>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(58,173,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#4ADE80',
    lineHeight: 20,
  },
  backToLogin: {
    alignItems: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandBlue,
  },
});
}
