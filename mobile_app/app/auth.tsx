import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SpaceBackground } from '../components/SpaceBackground';
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthDateOfBirthField } from '../components/auth/AuthDateOfBirthField';
import { AuthGlassPanel } from '../components/auth/AuthGlassPanel';
import { AuthTabSlideTransition } from '../components/auth/AuthTabSlideTransition';
import { CountryPhoneField } from '../components/auth/CountryPhoneField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { SegmentedAuthToggle, type AuthTab } from '../components/auth/SegmentedAuthToggle';
import { AuthInput } from '../components/AuthInput';
import { formatPhoneForSubmit, getDefaultCountry, type Country } from '../constants/countries';
import { spacing } from '../constants/theme';
import { apiFetch } from '../utils/api';
import {
  dobToIso,
  hasFieldErrors,
  validateDateOfBirth,
  validateEmail,
  validateLoginForm,
  validateName,
  validatePassword,
  validatePhone,
  validateSignupForm,
  validateConfirmPassword,
  formatAuthApiError,
  normalizeReferralCode,
  type LoginFieldErrors,
  type SignupFieldErrors,
} from '../utils/authValidation';
import { resolvePostLoginRoute, storeAuth } from '../utils/auth';
import {
  getBiometricCapabilities,
  getBiometricIcon,
  hasBiometricCredentials,
  loginWithBiometrics,
  type BiometricKind,
} from '../utils/biometric';

const LOGIN_COPY = {
  title: 'Welcome Back',
  tagline: 'Trade With Confidence',
  subtitle: 'Access Signals, Risk Management, And Execution Tools In One Workspace.',
};

const SIGNUP_COPY = {
  title: 'Create Account',
  tagline: 'Join The Desk',
  subtitle: 'Packages, desk tools, and mentorship — pick your path after signup',
};

export default function AuthScreen() {
  const router = useRouter();
  const { ref: refParam } = useLocalSearchParams<{ ref?: string }>();
  const { height: screenH } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none');
  const [hasSavedBiometricLogin, setHasSavedBiometricLogin] = useState(false);
  const autoBiometricAttempted = useRef(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    promoCode: '',
  });
  const [phoneCountry, setPhoneCountry] = useState<Country>(getDefaultCountry);
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});
  const [signupErrors, setSignupErrors] = useState<SignupFieldErrors>({});
  const [pending2FA, setPending2FA] = useState<{ email: string; tempToken: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const clearLoginError = (field: keyof LoginFieldErrors) => {
    setLoginErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearSignupError = (field: keyof SignupFieldErrors) => {
    setSignupErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const refreshBiometricState = useCallback(async () => {
    const caps = await getBiometricCapabilities();
    setBiometricAvailable(caps.available);
    setBiometricKind(caps.kind);
    setHasSavedBiometricLogin(await hasBiometricCredentials());
  }, []);

  useEffect(() => {
    refreshBiometricState();
  }, [refreshBiometricState]);

  // Pre-fill referral code from deep link (?ref=CODE), same as the website register page.
  useEffect(() => {
    if (refParam?.trim()) {
      setSignupForm((p) => ({ ...p, referralCode: normalizeReferralCode(refParam) }));
      setActiveTab('signup');
    }
  }, [refParam]);

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

  const handleTabChange = (tab: AuthTab) => {
    setError('');
    setLoginErrors({});
    setSignupErrors({});
    setPending2FA(null);
    setTwoFactorCode('');
    setActiveTab(tab);
  };

  const handleLogin = async () => {
    const fieldErrors = validateLoginForm(loginForm.email, loginForm.password);
    setLoginErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;

    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch('api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginForm.email.trim().toLowerCase(),
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.requiresTwoFactor && data.tempToken) {
        setPending2FA({
          email: data.email ?? loginForm.email.trim().toLowerCase(),
          tempToken: data.tempToken,
        });
        setTwoFactorCode('');
        return;
      }
      if (res.ok && data.token) {
        await storeAuth(data.token, data.user);
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

  const handleVerify2FA = async () => {
    if (!pending2FA) return;
    const code = twoFactorCode.replace(/\D/g, '');
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch('api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          email: pending2FA.email,
          tempToken: pending2FA.tempToken,
          twoFactorCode: code,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await storeAuth(data.token, data.user);
        const route = await resolvePostLoginRoute(data.user);
        router.replace(route as any);
      } else {
        setError(data.message ?? data.error ?? 'Invalid verification code.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancel2FA = () => {
    setPending2FA(null);
    setTwoFactorCode('');
    setError('');
  };

  const handleSignup = async () => {
    if (!termsAgreed) {
      setError('Please accept the terms and conditions');
      return;
    }

    const fieldErrors = validateSignupForm(signupForm);
    setSignupErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) {
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const firstName = signupForm.firstName.trim();
      const lastName = signupForm.lastName.trim();
      const email = signupForm.email.trim().toLowerCase();
      const password = signupForm.password.trim();
      const formattedPhone = formatPhoneForSubmit(signupForm.phone, phoneCountry);
      const isoDob = dobToIso(signupForm.dateOfBirth);
      const body: Record<string, string> = {
        firstName,
        lastName,
        email,
        password,
        country: phoneCountry.name,
      };
      if (formattedPhone) body.phone = formattedPhone;
      if (isoDob) body.dateOfBirth = isoDob;
      const referralCode = normalizeReferralCode(signupForm.referralCode);
      if (referralCode) body.referralCode = referralCode;
      const promoCode = signupForm.promoCode.trim().toUpperCase();
      if (promoCode) body.promoCode = promoCode;

      const res = await apiFetch('api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.token) {
        await storeAuth(data.token, data.user);
        const route = await resolvePostLoginRoute(data.user);
        router.replace(route as any);
      } else {
        setError(formatAuthApiError(data));
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginFormContent = pending2FA ? (
    <>
      <Text style={styles.twoFATitle}>Two-factor authentication</Text>
      <Text style={styles.twoFASubtitle}>
        Enter the 6-digit code from your authenticator app for {pending2FA.email}.
      </Text>
      <TextInput
        style={styles.twoFAInput}
        value={twoFactorCode}
        onChangeText={(v) => {
          setTwoFactorCode(v.replace(/\D/g, '').slice(0, 6));
          setError('');
        }}
        placeholder="000000"
        placeholderTextColor="rgba(255,255,255,0.25)"
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
        autoFocus
      />
      {error && activeTab === 'login' ? <Text style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton title="Verify & Sign In" loading={isLoading} onPress={handleVerify2FA} style={styles.submitBtn} />
      <Pressable onPress={cancel2FA} style={styles.twoFABack}>
        <Text style={styles.twoFABackText}>Back to login</Text>
      </Pressable>
    </>
  ) : (
    <>
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={loginForm.email}
        error={loginErrors.email}
        onChangeText={(email) => {
          setLoginForm((p) => ({ ...p, email }));
          clearLoginError('email');
        }}
        onBlur={() => setLoginErrors((prev) => ({ ...prev, email: validateEmail(loginForm.email) }))}
      />
      <AuthInput
        label="Password"
        placeholder="Enter your password"
        secureTextEntry={!showLoginPassword}
        value={loginForm.password}
        error={loginErrors.password}
        onChangeText={(password) => {
          setLoginForm((p) => ({ ...p, password }));
          clearLoginError('password');
        }}
        onBlur={() => setLoginErrors((prev) => ({ ...prev, password: validatePassword(loginForm.password) }))}
        rightIcon={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowLoginPassword((p) => !p)}
      />
      <View style={styles.loginMetaRow}>
        <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>
      </View>
      {error && activeTab === 'login' ? <Text style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton title="Login" loading={isLoading} onPress={handleLogin} style={styles.submitBtn} />
    </>
  );

  const signupFormContent = (
    <>
      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <AuthInput
            label="First Name"
            placeholder="First name"
            error={signupErrors.firstName}
            onChangeText={(firstName) => {
              setSignupForm((p) => ({ ...p, firstName }));
              clearSignupError('firstName');
            }}
            onBlur={() =>
              setSignupErrors((prev) => ({
                ...prev,
                firstName: validateName(signupForm.firstName, 'First name'),
              }))
            }
          />
        </View>
        <View style={styles.nameField}>
          <AuthInput
            label="Last Name"
            placeholder="Last name"
            error={signupErrors.lastName}
            onChangeText={(lastName) => {
              setSignupForm((p) => ({ ...p, lastName }));
              clearSignupError('lastName');
            }}
            onBlur={() =>
              setSignupErrors((prev) => ({
                ...prev,
                lastName: validateName(signupForm.lastName, 'Last name'),
              }))
            }
          />
        </View>
      </View>
      <AuthInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={signupForm.email}
        error={signupErrors.email}
        onChangeText={(email) => {
          setSignupForm((p) => ({ ...p, email }));
          clearSignupError('email');
        }}
        onBlur={() => setSignupErrors((prev) => ({ ...prev, email: validateEmail(signupForm.email) }))}
      />
      <AuthDateOfBirthField
        label="Date of birth"
        value={signupForm.dateOfBirth}
        error={signupErrors.dateOfBirth}
        onChangeValue={(dateOfBirth) => {
          setSignupForm((p) => ({ ...p, dateOfBirth }));
          clearSignupError('dateOfBirth');
        }}
        onBlur={() =>
          setSignupErrors((prev) => ({
            ...prev,
            dateOfBirth: validateDateOfBirth(signupForm.dateOfBirth),
          }))
        }
      />
      <CountryPhoneField
        label="Phone Number"
        placeholder="555 123 4567"
        value={signupForm.phone}
        country={phoneCountry}
        error={signupErrors.phone}
        onChangeValue={(phone) => {
          setSignupForm((p) => ({ ...p, phone }));
          clearSignupError('phone');
        }}
        onChangeCountry={setPhoneCountry}
        onBlur={() =>
          setSignupErrors((prev) => ({ ...prev, phone: validatePhone(signupForm.phone) }))
        }
      />
      <AuthInput
        label="Set Password"
        placeholder="Create a password (min. 6 chars)"
        secureTextEntry={!showSignupPassword}
        value={signupForm.password}
        error={signupErrors.password}
        onChangeText={(password) => {
          setSignupForm((p) => ({ ...p, password }));
          clearSignupError('password');
          if (signupForm.confirmPassword) clearSignupError('confirmPassword');
        }}
        onBlur={() =>
          setSignupErrors((prev) => ({ ...prev, password: validatePassword(signupForm.password) }))
        }
        rightIcon={showSignupPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowSignupPassword((p) => !p)}
      />
      <AuthInput
        label="Confirm password"
        placeholder="Repeat your password"
        secureTextEntry={!showConfirmPassword}
        value={signupForm.confirmPassword}
        error={signupErrors.confirmPassword}
        onChangeText={(confirmPassword) => {
          setSignupForm((p) => ({ ...p, confirmPassword }));
          clearSignupError('confirmPassword');
        }}
        onBlur={() =>
          setSignupErrors((prev) => ({
            ...prev,
            confirmPassword: validateConfirmPassword(signupForm.password, signupForm.confirmPassword),
          }))
        }
        rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowConfirmPassword((p) => !p)}
      />
      <AuthInput
        label="Referral code"
        placeholder="Referral code (optional)"
        autoCapitalize="characters"
        value={signupForm.referralCode}
        onChangeText={(referralCode) => setSignupForm((p) => ({ ...p, referralCode }))}
        onBlur={() =>
          setSignupForm((p) => ({ ...p, referralCode: normalizeReferralCode(p.referralCode) }))
        }
      />
      <AuthInput
        label="Promo code"
        placeholder="Promo code (optional)"
        autoCapitalize="characters"
        value={signupForm.promoCode}
        onChangeText={(promoCode) => setSignupForm((p) => ({ ...p, promoCode }))}
      />
      {error && activeTab === 'signup' ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.termsRow}>
        <Pressable style={styles.checkboxHit} onPress={() => setTermsAgreed((v) => !v)}>
          <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
            {termsAgreed ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
          </View>
        </Pressable>
        <Text style={styles.termsText}>
          I have read and agree to the{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/disclaimer')}>
            disclaimer
          </Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/disclaimer')}>
            terms and conditions
          </Text>
        </Text>
      </View>
      <PrimaryButton title="Sign Up" loading={isLoading} onPress={handleSignup} style={styles.submitBtn} />
    </>
  );

  return (
    <View style={styles.screen}>
      <SpaceBackground />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { minHeight: screenH - 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthTabSlideTransition
              activeTab={activeTab}
              login={
                <AuthHeader
                  title={LOGIN_COPY.title}
                  tagline={LOGIN_COPY.tagline}
                  subtitle={LOGIN_COPY.subtitle}
                />
              }
              signup={
                <AuthHeader
                  title={SIGNUP_COPY.title}
                  tagline={SIGNUP_COPY.tagline}
                  subtitle={SIGNUP_COPY.subtitle}
                />
              }
            />

            <SegmentedAuthToggle activeTab={activeTab} onTabChange={handleTabChange} />

            <AuthGlassPanel>
              <AuthTabSlideTransition
                activeTab={activeTab}
                login={loginFormContent}
                signup={signupFormContent}
              />
            </AuthGlassPanel>

            <Pressable
              style={styles.exploreLinkWrap}
              onPress={() => router.push('/onboarding?preview=1')}
              accessibilityRole="link"
              accessibilityLabel="Explore welcome screens"
            >
              <Text style={styles.exploreLink}>Explore</Text>
            </Pressable>
          </ScrollView>

          {activeTab === 'login' && !pending2FA && hasSavedBiometricLogin && biometricAvailable ? (
            <View style={styles.biometricFooter}>
              <Pressable
                style={[styles.biometricBtn, biometricLoading && styles.biometricBtnDisabled]}
                onPress={() => handleBiometricLogin(false)}
                disabled={biometricLoading || isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with biometrics"
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#036FFC" size="small" />
                ) : (
                  <Ionicons name={getBiometricIcon(biometricKind)} size={38} color="#036FFC" />
                )}
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  loginMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 0,
  },
  submitBtn: {
    marginTop: 18,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  checkboxChecked: {
    backgroundColor: '#036FFC',
    borderColor: '#036FFC',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  checkboxHit: {
    paddingTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
  termsLink: {
    color: '#036FFC',
    fontWeight: '600',
  },
  rememberText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  forgotText: {
    fontSize: 13,
    color: '#036FFC',
  },
  twoFATitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  twoFASubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 16,
  },
  twoFAInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 8,
    marginBottom: 16,
  },
  twoFABack: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  twoFABackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#036FFC',
  },
  errorText: {
    fontSize: 13,
    color: '#fecaca',
    lineHeight: 18,
    marginBottom: 12,
    backgroundColor: 'rgba(127,29,29,0.4)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  biometricFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  biometricBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',

  },
  biometricBtnDisabled: {
    opacity: 0.6,
  },
  exploreLinkWrap: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  exploreLink: {
    fontSize: 13,
    color: '#036FFC',
    fontWeight: '600',
  },
});
