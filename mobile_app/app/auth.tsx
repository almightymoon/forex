import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AuthTabs } from '../components/AuthTabs';
import { GradientButton } from '../components/GradientButton';
import { Logo } from '../components/Logo';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch } from '../utils/api';
import { resolvePostLoginRoute, storeAuth } from '../utils/auth';
import {
  getBiometricCapabilities,
  getBiometricIcon,
  getBiometricLabel,
  hasBiometricCredentials,
  loginWithBiometrics,
  saveBiometricCredentials,
  type BiometricKind,
} from '../utils/biometric';

type AuthTab = 'login' | 'signup';

/** Phone prefix element — UK flag + chevron */
function PhonePrefix() {
  return (
    <View style={phonePrefixStyles.row}>
      <Text style={phonePrefixStyles.flag}>🇬🇧</Text>
      <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.45)" />
      <View style={phonePrefixStyles.divider} />
    </View>
  );
}

const phonePrefixStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 6,
  },
});

export default function AuthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none');
  const [hasSavedBiometricLogin, setHasSavedBiometricLogin] = useState(false);
  const autoBiometricAttempted = useRef(false);

  const refreshBiometricState = useCallback(async () => {
    const caps = await getBiometricCapabilities();
    setBiometricAvailable(caps.available);
    setBiometricKind(caps.kind);
    setHasSavedBiometricLogin(await hasBiometricCredentials());
  }, []);

  useEffect(() => {
    refreshBiometricState();
  }, [refreshBiometricState]);

  const handleBiometricLogin = useCallback(async (isAuto = false) => {
    if (biometricLoading || isLoading) return;
    setBiometricLoading(true);
    if (!isAuto) setError('');
    try {
      const result = await loginWithBiometrics();
      if (result.success) {
        router.replace(result.route as any);
        return;
      }
      if (!result.cancelled) {
        setError(result.error);
      }
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricLoading, isLoading, router]);

  useEffect(() => {
    if (activeTab !== 'login' || autoBiometricAttempted.current || !hasSavedBiometricLogin) return;
    autoBiometricAttempted.current = true;
    handleBiometricLogin(true);
  }, [activeTab, hasSavedBiometricLogin, handleBiometricLogin]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phone: '',
    password: '',
    referralCode: '',
  });

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) { setError('Email and password are required'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch('api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginForm.email.trim().toLowerCase(), password: loginForm.password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await storeAuth(data.token, data.user);
        if (rememberMe && biometricAvailable) {
          await saveBiometricCredentials(loginForm.email, loginForm.password);
          setHasSavedBiometricLogin(true);
        }
        const route = await resolvePostLoginRoute(data.user);
        router.replace(route as any);
      } else {
        setError(data.message ?? data.error ?? 'Login failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupForm.firstName || !signupForm.lastName) { setError('First and last name are required'); return; }
    if (!signupForm.email) { setError('Email is required'); return; }
    if (!signupForm.password || signupForm.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    setError('');
    try {
      const body: Record<string, string> = {
        firstName: signupForm.firstName.trim(),
        lastName: signupForm.lastName.trim(),
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        phone: signupForm.phone.trim(),
      };
      if (signupForm.dateOfBirth.trim()) body.dateOfBirth = signupForm.dateOfBirth.trim();
      if (signupForm.referralCode) body.referralCode = signupForm.referralCode.trim().toUpperCase();
      const res = await apiFetch('api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.token) {
        await storeAuth(data.token, data.user);
        router.replace('/select-package');
      } else {
        setError(data.message ?? data.error ?? 'Registration failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'login' ? (
              // ─── LOGIN ───────────────────────────────────────────
              <>
                <View style={styles.header}>
                  <Logo size="md" />
                  <Text style={styles.title}>Welcome back</Text>
                  <Text style={styles.subtitle}>
                    Login to continue your trading journey{'\n'}with The FX Navigators
                  </Text>
                </View>

                <AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <AuthInput
                  label="Email"
                  icon="mail-outline"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={loginForm.email}
                  onChangeText={(email) => setLoginForm((p) => ({ ...p, email }))}
                />
                <AuthInput
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  secureTextEntry={!showLoginPassword}
                  value={loginForm.password}
                  onChangeText={(password) => setLoginForm((p) => ({ ...p, password }))}
                  rightIcon={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowLoginPassword((p) => !p)}
                />

                <View style={styles.metaRow}>
                  <Pressable style={styles.rememberRow} onPress={() => setRememberMe((p) => !p)}>
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.rememberText}>
                      {biometricAvailable ? `Remember me · ${getBiometricLabel(biometricKind)}` : 'Remember me'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/forgot-password')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <GradientButton title="Log In" loading={isLoading} onPress={handleLogin} />

                {hasSavedBiometricLogin && biometricAvailable ? (
                  <>
                    <View style={styles.orRow}>
                      <View style={styles.orLine} />
                      <Text style={styles.orText}>or</Text>
                      <View style={styles.orLine} />
                    </View>
                    <Pressable
                      style={[styles.biometricBtn, biometricLoading && styles.biometricBtnDisabled]}
                      onPress={() => handleBiometricLogin(false)}
                      disabled={biometricLoading || isLoading}
                    >
                      <Ionicons
                        name={getBiometricIcon(biometricKind)}
                        size={22}
                        color="#3B9EFF"
                      />
                      <Text style={styles.biometricBtnText}>
                        {biometricLoading
                          ? 'Authenticating…'
                          : `Sign in with ${getBiometricLabel(biometricKind)}`}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : (
              // ─── SIGN UP ─────────────────────────────────────────
              <>
                <View style={styles.headerNoLogo}>
                  <Text style={styles.title}>Get Started now</Text>
                  <Text style={styles.subtitle}>
                    Create an account or log in to explore{'\n'}about our app
                  </Text>
                </View>

                <AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <AuthInput
                      label="First Name"
                      icon="person-outline"
                      placeholder="First name"
                      autoCapitalize="words"
                      value={signupForm.firstName}
                      onChangeText={(firstName) => setSignupForm((p) => ({ ...p, firstName }))}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <AuthInput
                      label="Last Name"
                      icon="person-outline"
                      placeholder="Last name"
                      autoCapitalize="words"
                      value={signupForm.lastName}
                      onChangeText={(lastName) => setSignupForm((p) => ({ ...p, lastName }))}
                    />
                  </View>
                </View>

                <AuthInput
                  label="Email"
                  icon="mail-outline"
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={signupForm.email}
                  onChangeText={(email) => setSignupForm((p) => ({ ...p, email }))}
                />

                {/* Date of birth — calendar icon on both sides */}
                <AuthInput
                  label="Birth of date"
                  icon="calendar-outline"
                  placeholder="DD / MM / YYYY"
                  value={signupForm.dateOfBirth}
                  onChangeText={(dateOfBirth) => setSignupForm((p) => ({ ...p, dateOfBirth }))}
                  rightIcon="calendar-outline"
                />

                {/* Phone — UK flag prefix + number */}
                <AuthInput
                  label="Phone Number"
                  leftPrefix={<PhonePrefix />}
                  placeholder="+44 0000 000 000"
                  keyboardType="phone-pad"
                  value={signupForm.phone}
                  onChangeText={(phone) => setSignupForm((p) => ({ ...p, phone }))}
                />

                <AuthInput
                  label="Set Password"
                  icon="lock-closed-outline"
                  placeholder="Create a strong password"
                  secureTextEntry={!showSignupPassword}
                  value={signupForm.password}
                  onChangeText={(password) => setSignupForm((p) => ({ ...p, password }))}
                  rightIcon={showSignupPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowSignupPassword((p) => !p)}
                />

                <AuthInput
                  label="Referral code"
                  icon="gift-outline"
                  placeholder="Enter referral code"
                  autoCapitalize="characters"
                  value={signupForm.referralCode}
                  onChangeText={(referralCode) => setSignupForm((p) => ({ ...p, referralCode }))}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <GradientButton title="Sign Up" loading={isLoading} onPress={handleSignup} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },

  // Login header (with logo)
  header: {
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 26,
  },

  // Signup header (no logo, less top padding)
  headerNoLogo: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 26,
  },

  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.48)',
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },

  // Remember me row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    borderColor: '#3B9EFF',
    backgroundColor: 'rgba(59, 158, 255, 0.2)',
  },
  checkmark: {
    color: '#3B9EFF',
    fontSize: 10,
    fontWeight: '700',
  },
  rememberText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B9EFF',
  },
  errorText: {
    fontSize: 13,
    color: '#FF5A5A',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255,90,90,0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.2)',
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameField: {
    flex: 1,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    marginBottom: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  orText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 158, 255, 0.35)',
    backgroundColor: 'rgba(59, 158, 255, 0.08)',
  },
  biometricBtnDisabled: {
    opacity: 0.6,
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B9EFF',
  },
});
