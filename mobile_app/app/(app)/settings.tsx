import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
import { AuthInput } from '../../components/AuthInput';
import { GradientButton } from '../../components/GradientButton';
import { ThemedSwitch } from '../../components/ThemedSwitch';
import { GlassDivider, GlassSection } from '../../components/glass/GlassSection';
import type { ColorSchemeMode } from '../../utils/themeStorage';
import { apiFetch } from '../../utils/api';
import { clearAppCache } from '../../utils/clearAppCache';
import {
  clearCrashLogs,
  flushCrashLogsToServer,
  getCrashLogs,
  type CrashLogEntry,
} from '../../utils/crashReporter';
import {
  getPushRegistrationStatus,
  isPushNotificationsSupported,
  registerPushTokenDetailed,
  type PushRegistrationStatus,
} from '../../utils/pushNotifications';
import { getStoredUser } from '../../utils/auth';
import {
  clearBiometricCredentials,
  getBiometricCapabilities,
  getBiometricLabel,
  hasBiometricCredentials,
  setBiometricLoginEnabled,
  setupBiometricLogin,
  type BiometricKind,
} from '../../utils/biometric';

export default function SettingsScreen() {
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const modal = useMemo(() => createModalStyles(colors), [colors]);
  const trStyles = useMemo(() => createTrStyles(colors), [colors]);
  const storageStyles = useMemo(() => createStorageStyles(colors), [colors]);
  const router = useRouter();

  // Notification prefs
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus | null>(null);
  const [pushRetrying, setPushRetrying] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret2FA, setSecret2FA] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading2, setTwoFALoading2] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBiometricPassword, setShowBiometricPassword] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [cacheClearing, setCacheClearing] = useState(false);
  const [crashLogs, setCrashLogs] = useState<CrashLogEntry[]>([]);
  const [crashBusy, setCrashBusy] = useState(false);

  useEffect(() => {
    // Load notification prefs
    apiFetch('api/notifications/preferences').then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        const prefs = d.preferences ?? {};
        const channels = d.channels ?? {};
        if (typeof channels.email?.enabled === 'boolean') {
          setEmailNotif(channels.email.enabled);
        } else if (typeof prefs.emailNotifications === 'boolean') {
          setEmailNotif(prefs.emailNotifications);
        }
        if (typeof channels.push?.enabled === 'boolean') {
          setPushNotif(channels.push.enabled);
        } else if (typeof prefs.pushNotifications === 'boolean') {
          setPushNotif(prefs.pushNotifications);
        }
      }
    }).catch(() => {}).finally(() => setPrefsLoading(false));

    // Load 2FA status
    apiFetch('api/user2fa/status').then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        setTwoFAEnabled(d.twoFactorEnabled ?? false);
      }
    }).catch(() => {}).finally(() => setTwoFALoading(false));

    if (isPushNotificationsSupported()) {
      void (async () => {
        const status = await registerPushTokenDetailed();
        setPushStatus(status);
      })();
    } else {
      void getPushRegistrationStatus().then(setPushStatus);
    }

    (async () => {
      const caps = await getBiometricCapabilities();
      setBiometricAvailable(caps.available);
      setBiometricKind(caps.kind);
      setBiometricEnabled(await hasBiometricCredentials());
    })();

    void getCrashLogs().then(setCrashLogs);
  }, []);

  const savePrefs = async (push: boolean, email: boolean) => {
    setPrefsSaving(true);
    try {
      await apiFetch('api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ pushNotifications: push, emailNotifications: email }),
      });
    } catch { /* ignore */ } finally { setPrefsSaving(false); }
  };

  const retryPushRegistration = async () => {
    if (pushRetrying) return;
    setPushRetrying(true);
    try {
      const status = await registerPushTokenDetailed();
      setPushStatus(status);
      if (status.ok) {
        setPushNotif(true);
        await savePrefs(true, emailNotif);
        Alert.alert('Notifications on', 'You will receive signal alerts even when the app is closed.');
      } else if (status.reason === 'permission_denied') {
        Alert.alert(
          'Notifications are off',
          'Enable notifications for The FX Navigators in your phone Settings, then tap Retry.',
        );
      } else {
        Alert.alert('Could not enable alerts', status.message);
      }
    } finally {
      setPushRetrying(false);
    }
  };

  const handlePushToggle = async (v: boolean) => {
    setPushNotif(v);
    savePrefs(v, emailNotif);
    if (v) {
      const status = await registerPushTokenDetailed();
      setPushStatus(status);
      if (!status.ok) {
        Alert.alert('Notifications need attention', status.message);
      }
    }
  };
  const handleEmailToggle = (v: boolean) => { setEmailNotif(v); savePrefs(pushNotif, v); };

  const handleBiometricToggle = async (next: boolean) => {
    if (biometricLoading) return;
    if (!next) {
      setBiometricLoading(true);
      try {
        await setBiometricLoginEnabled(false);
        setBiometricEnabled(false);
      } finally {
        setBiometricLoading(false);
      }
      return;
    }
    if (!biometricAvailable) {
      Alert.alert('Unavailable', 'Biometric authentication is not set up on this device.');
      return;
    }
    setBiometricError('');
    setBiometricPassword('');
    setShowBiometricPassword(false);
    setShowBiometricSetup(true);
  };

  const confirmBiometricSetup = async () => {
    if (!biometricPassword) {
      setBiometricError('Enter your password to enable biometric sign-in.');
      return;
    }
    const user = await getStoredUser();
    if (!user?.email) {
      setBiometricError('Could not find your account email. Please sign in again.');
      return;
    }

    setBiometricLoading(true);
    setBiometricError('');
    try {
      const result = await setupBiometricLogin(user.email, biometricPassword);
      if (result.success) {
        setBiometricEnabled(true);
        setShowBiometricSetup(false);
        setBiometricPassword('');
        Alert.alert(
          'Enabled',
          `${getBiometricLabel(biometricKind)} sign-in is now available on the login screen.`,
        );
        return;
      }
      setBiometricError(result.error);
    } finally {
      setBiometricLoading(false);
    }
  };

  // ── 2FA Enable flow ────────────────────────────────────────────────────────
  const start2FASetup = async () => {
    setTwoFAError('');
    setTwoFALoading2(true);
    try {
      const res = await apiFetch('api/user2fa/setup', { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTwoFAError((d as any).message ?? 'Failed to start 2FA setup.');
        return;
      }
      setQrCode((d as any).qrCode ?? '');
      setSecret2FA((d as any).secret ?? '');
      setManualKey((d as any).manualEntryKey ?? '');
      setTwoFACode('');
      setShowSetup2FA(true);
    } catch {
      setTwoFAError('Network error. Please try again.');
    } finally {
      setTwoFALoading2(false);
    }
  };

  const confirm2FAEnable = async () => {
    if (twoFACode.length !== 6) { setTwoFAError('Enter the 6-digit code from your authenticator app.'); return; }
    setTwoFALoading2(true);
    setTwoFAError('');
    try {
      const res = await apiFetch('api/user2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret: secret2FA, token: twoFACode }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setTwoFAEnabled(true);
        setShowSetup2FA(false);
        const codes: string[] = (d as any).backupCodes ?? [];
        if (codes.length > 0) { setBackupCodes(codes); setShowBackupCodes(true); }
        else Alert.alert('2FA Enabled', 'Two-factor authentication is now active on your account.');
      } else {
        setTwoFAError((d as any).message ?? 'Incorrect code. Please try again.');
      }
    } catch {
      setTwoFAError('Network error. Please try again.');
    } finally { setTwoFALoading2(false); }
  };

  // ── 2FA Disable flow ───────────────────────────────────────────────────────
  const confirm2FADisable = async () => {
    if (twoFACode.length !== 6) { setTwoFAError('Enter the 6-digit code from your authenticator app.'); return; }
    setTwoFALoading2(true);
    setTwoFAError('');
    try {
      const res = await apiFetch('api/user2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: twoFACode }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setTwoFAEnabled(false);
        setShowDisable2FA(false);
        Alert.alert('2FA Disabled', '2FA has been removed from your account.');
      } else {
        setTwoFAError((d as any).message ?? 'Incorrect code. Please try again.');
      }
    } catch {
      setTwoFAError('Network error. Please try again.');
    } finally { setTwoFALoading2(false); }
  };

  const handleSendCrashLogs = async () => {
    setCrashBusy(true);
    try {
      const sent = await flushCrashLogsToServer();
      const remaining = await getCrashLogs();
      setCrashLogs(remaining);
      Alert.alert(
        sent > 0 ? 'Reports sent' : 'Nothing to send',
        sent > 0
          ? `${sent} error report(s) were uploaded.`
          : 'No pending reports, or the server could not be reached.',
      );
    } finally {
      setCrashBusy(false);
    }
  };

  const handleClearCrashLogs = async () => {
    await clearCrashLogs();
    setCrashLogs([]);
    Alert.alert('Cleared', 'Saved error reports were removed from this device.');
  };

  const handleClearCache = async () => {
    setCacheClearing(true);
    try {
      await clearAppCache();
      Alert.alert(
        'Cache cleared',
        'Downloaded data and images were removed. Your account and settings are unchanged.',
      );
    } catch {
      Alert.alert('Could not clear cache', 'Please try again in a moment.');
    } finally {
      setCacheClearing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { setPwError('Both fields are required'); return; }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    setPwLoading(true); setPwError(''); setPwSuccess('');
    try {
      const res = await apiFetch('api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwSuccess('Password changed successfully.');
        setCurrentPw(''); setNewPw('');
        await clearBiometricCredentials();
        setBiometricEnabled(false);
      } else {
        const d = await res.json().catch(() => ({}));
        setPwError((d as any).message ?? 'Failed to change password.');
      }
    } catch { setPwError('Network error. Please try again.'); } finally { setPwLoading(false); }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.pageTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Appearance */}
          <GlassSection title="Appearance">
            <Text style={styles.bgSectionLabel}>Color theme</Text>
            <Text style={styles.bgHint}>Light, dark, or match your device setting.</Text>
            <View style={styles.modeRow}>
              {([
                { mode: 'light' as ColorSchemeMode, label: 'Light' },
                { mode: 'dark' as ColorSchemeMode, label: 'Dark' },
                { mode: 'system' as ColorSchemeMode, label: 'System' },
              ]).map(({ mode, label }) => {
                const active = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => setThemeMode(mode)}
                  >
                    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassSection>

          {/* Notifications */}
          {prefsLoading ? (
            <GlassSection title="Notifications">
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator color={colors.text} />
              </View>
            </GlassSection>
          ) : (
            <GlassSection title="Notifications">
              <ToggleRow
                label="Push Notifications"
                sublabel={
                  isPushNotificationsSupported()
                    ? 'Instant signal alerts (even when the app is closed)'
                    : 'Requires a development or production build (not available in Expo Go)'
                }
                value={pushNotif}
                onChange={handlePushToggle}
                saving={prefsSaving}
                disabled={!isPushNotificationsSupported()}
              />
              {pushStatus && !pushStatus.ok ? (
                <>
                  <GlassDivider />
                  <Pressable
                    onPress={retryPushRegistration}
                    disabled={pushRetrying}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Ionicons name="warning-outline" size={18} color={colors.gold} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                        Notifications are off
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {pushStatus.message}
                      </Text>
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 13,
                          fontWeight: '600',
                          marginTop: 6,
                        }}
                      >
                        {pushRetrying ? 'Retrying…' : 'Tap to enable / retry'}
                      </Text>
                    </View>
                  </Pressable>
                </>
              ) : null}
              <GlassDivider />
              <ToggleRow label="Email Alerts" sublabel="Get updates via email" value={emailNotif} onChange={handleEmailToggle} saving={prefsSaving} />
            </GlassSection>
          )}

          <GlassSection title="Storage">
            <StorageActionRow
              icon="layers"
              label="Clear app cache"
              sublabel="Remove cached images and API data. Sign-in and theme preference are kept."
              onPress={handleClearCache}
              busy={cacheClearing}
            />
            <GlassDivider />
            <StorageActionRow
              icon="activity"
              label="Send error reports"
              sublabel={
                crashLogs.length > 0
                  ? `${crashLogs.length} saved on this device`
                  : 'No reports saved yet'
              }
              onPress={handleSendCrashLogs}
              busy={crashBusy}
            />
            {crashLogs.length > 0 ? (
              <>
                <GlassDivider />
                <View style={storageStyles.logPanel}>
                  <Text style={storageStyles.logTitle}>Latest report</Text>
                  <Text style={storageStyles.logMessage} numberOfLines={3}>
                    {crashLogs[0].message}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [storageStyles.logClearBtn, pressed && { opacity: 0.7 }]}
                    onPress={handleClearCrashLogs}
                  >
                    <Text style={storageStyles.logClearText}>Clear saved reports</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </GlassSection>

          {/* Security – 2FA */}
          <GlassSection title="Security">
            <ToggleRow
              label={biometricAvailable ? `${getBiometricLabel(biometricKind)} sign-in` : 'Biometric sign-in'}
              sublabel={
                biometricAvailable
                  ? biometricEnabled
                    ? 'Quick sign-in with biometrics is enabled'
                    : 'Turn on to sign in with biometrics from the login screen'
                  : 'Not available on this device'
              }
              value={biometricEnabled}
              onChange={handleBiometricToggle}
              saving={biometricLoading}
              disabled={!biometricAvailable}
            />
            <GlassDivider />
            {twoFALoading ? (
              <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator color={colors.text} /></View>
            ) : (
              <View style={styles.twoFARow}>
                <View style={styles.twoFAInfo}>
                  <Text style={styles.twoFALabel}>Two-Factor Authentication</Text>
                  <Text style={styles.twoFASub}>
                    {twoFAEnabled ? '2FA is active — your account is extra secure.' : 'Add an extra layer of protection with an authenticator app.'}
                  </Text>
                  {twoFAError !== '' && <Text style={styles.twoFAError}>{twoFAError}</Text>}
                </View>
                <Pressable
                  style={[styles.twoFABtn, twoFAEnabled && styles.twoFABtnOff]}
                  onPress={() => {
                    setTwoFAError('');
                    setTwoFACode('');
                    if (twoFAEnabled) setShowDisable2FA(true);
                    else start2FASetup();
                  }}
                  disabled={twoFALoading2}
                >
                  {twoFALoading2
                    ? <ActivityIndicator size="small" color={twoFAEnabled ? '#FF5A5A' : colors.primaryForeground} />
                    : <Text style={[styles.twoFABtnText, twoFAEnabled && styles.twoFABtnTextOff]}>{twoFAEnabled ? 'Disable' : 'Enable'}</Text>}
                </Pressable>
              </View>
            )}
          </GlassSection>

          {/* Change Password */}
          <GlassSection title="Change Password" contentStyle={styles.pwCardInner}>
            <AuthInput label="Current Password" icon="lock-closed-outline" placeholder="Enter current password" secureTextEntry={!showCurrent} value={currentPw} onChangeText={(v) => { setCurrentPw(v); setPwError(''); setPwSuccess(''); }} rightIcon={showCurrent ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowCurrent((p) => !p)} />
            <AuthInput label="New Password" icon="lock-open-outline" placeholder="Enter new password" secureTextEntry={!showNew} value={newPw} onChangeText={(v) => { setNewPw(v); setPwError(''); setPwSuccess(''); }} rightIcon={showNew ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowNew((p) => !p)} />
            {pwError ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={15} color="#FF5A5A" /><Text style={styles.errorText}>{pwError}</Text></View> : null}
            {pwSuccess ? <View style={styles.successBox}><Ionicons name="checkmark-circle" size={15} color="#4ADE80" /><Text style={styles.successText}>{pwSuccess}</Text></View> : null}
            <GradientButton title="Update Password" loading={pwLoading} onPress={handleChangePassword} />
          </GlassSection>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Biometric setup modal */}
      <Modal visible={showBiometricSetup} animationType="slide" presentationStyle="pageSheet">
        <View style={modal.screen}>
          <View style={modal.header}>
            <Text style={modal.title}>
              Enable {biometricAvailable ? getBiometricLabel(biometricKind) : 'Biometric'} sign-in
            </Text>
            <Pressable onPress={() => { setShowBiometricSetup(false); setBiometricPassword(''); setBiometricError(''); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.content}>
            <Text style={modal.instruction}>
              Confirm your password and verify with {getBiometricLabel(biometricKind)} to enable quick sign-in on this device.
            </Text>
            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter your account password"
              secureTextEntry={!showBiometricPassword}
              value={biometricPassword}
              onChangeText={(v) => { setBiometricPassword(v); setBiometricError(''); }}
              rightIcon={showBiometricPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowBiometricPassword((p) => !p)}
            />
            {biometricError ? <Text style={modal.error}>{biometricError}</Text> : null}
            <GradientButton
              title={`Enable ${getBiometricLabel(biometricKind)} sign-in`}
              loading={biometricLoading}
              onPress={confirmBiometricSetup}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal visible={showSetup2FA} animationType="slide" presentationStyle="pageSheet">
        <View style={modal.screen}>
          <View style={modal.header}>
            <Text style={modal.title}>Set Up 2FA</Text>
            <Pressable onPress={() => setShowSetup2FA(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.content}>
            <Text style={modal.step}>Step 1</Text>
            <Text style={modal.instruction}>Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code, or enter the key manually.</Text>
            {qrCode ? (
              <View style={modal.qrWrap}>
                <Image
                  source={{ uri: qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}` }}
                  style={modal.qrImage}
                  resizeMode="contain"
                />
                <Text style={modal.manualKey}>{manualKey}</Text>
                <Text style={modal.manualKeyNote}>Manual entry key (copy into your authenticator app)</Text>
              </View>
            ) : null}
            <Text style={modal.step}>Step 2</Text>
            <Text style={modal.instruction}>Enter the 6-digit code shown in your authenticator app.</Text>
            <TextInput
              style={modal.codeInput}
              value={twoFACode}
              onChangeText={(v) => { setTwoFACode(v.replace(/\D/g, '').slice(0, 6)); setTwoFAError(''); }}
              placeholder="000000"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            {twoFAError ? <Text style={modal.error}>{twoFAError}</Text> : null}
            <GradientButton title="Enable 2FA" loading={twoFALoading2} onPress={confirm2FAEnable} />
          </ScrollView>
        </View>
      </Modal>

      {/* 2FA Disable Modal */}
      <Modal visible={showDisable2FA} animationType="slide" presentationStyle="pageSheet">
        <View style={modal.screen}>
          <View style={modal.header}>
            <Text style={modal.title}>Disable 2FA</Text>
            <Pressable onPress={() => setShowDisable2FA(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.content}>
            <View style={modal.warnBox}>
              <Ionicons name="warning-outline" size={24} color="#FFC107" />
              <Text style={modal.warnText}>Disabling 2FA will make your account less secure. Only proceed if you intend to remove this protection.</Text>
            </View>
            <Text style={modal.instruction}>Enter the 6-digit code from your authenticator app to confirm.</Text>
            <TextInput
              style={modal.codeInput}
              value={twoFACode}
              onChangeText={(v) => { setTwoFACode(v.replace(/\D/g, '').slice(0, 6)); setTwoFAError(''); }}
              placeholder="000000"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            {twoFAError ? <Text style={modal.error}>{twoFAError}</Text> : null}
            <Pressable style={modal.disableBtn} onPress={confirm2FADisable} disabled={twoFALoading2}>
              {twoFALoading2 ? <ActivityIndicator color="#FF5A5A" /> : <Text style={modal.disableBtnText}>Confirm — Disable 2FA</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Backup codes modal */}
      <Modal visible={showBackupCodes} animationType="slide" presentationStyle="pageSheet">
        <View style={modal.screen}>
          <View style={modal.header}>
            <Text style={modal.title}>Backup Codes</Text>
            <Pressable onPress={() => setShowBackupCodes(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.content}>
            <View style={modal.warnBox}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4ADE80" />
              <Text style={[modal.warnText, { color: '#4ADE80' }]}>2FA enabled! Save these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator.</Text>
            </View>
            <View style={modal.codesGrid}>
              {backupCodes.map((c, i) => (
                <View key={i} style={modal.codeChip}>
                  <Text style={modal.codeChipText}>{c}</Text>
                </View>
              ))}
            </View>
            <GradientButton title="Done — I've saved these codes" onPress={() => setShowBackupCodes(false)} />
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

function StorageActionRow({
  icon,
  label,
  sublabel,
  onPress,
  busy,
  disabled,
}: {
  icon: AppIconName;
  label: string;
  sublabel: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const storageStyles = useMemo(() => createStorageStyles(colors), [colors]);
  const inactive = disabled || busy;

  return (
    <Pressable
      style={({ pressed }) => [
        storageStyles.actionRow,
        inactive && storageStyles.actionRowDisabled,
        pressed && !inactive && storageStyles.actionRowPressed,
      ]}
      onPress={onPress}
      disabled={inactive}
    >
      <View style={storageStyles.actionIconWrap}>
        <AppIcon name={icon} size={18} color={colors.text} strokeWidth={2.1} />
      </View>
      <View style={storageStyles.actionCopy}>
        <Text style={storageStyles.actionLabel}>{label}</Text>
        <Text style={storageStyles.actionSub}>{sublabel}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <AppIcon name="chevron-right" size={16} color={colors.textMuted} strokeWidth={2} />
      )}
    </Pressable>
  );
}

function ToggleRow({ label, sublabel, value, onChange, saving, disabled }: {
  label: string; sublabel: string; value: boolean; onChange: (v: boolean) => void; saving?: boolean; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const trStyles = useMemo(() => createTrStyles(colors), [colors]);

  return (
    <View style={[trStyles.row, disabled && { opacity: 0.45 }]}>
      <View style={trStyles.text}>
        <Text style={trStyles.label}>{label}</Text>
        <Text style={trStyles.sub}>{sublabel}</Text>
      </View>
      {saving ? (
        <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 4 }} />
      ) : (
        <ThemedSwitch value={value} onValueChange={onChange} disabled={disabled} />
      )}
    </View>
  );
}

function createStorageStyles(colors: AppColors) {
  return StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  actionRowPressed: { backgroundColor: colors.surfaceHover },
  actionRowDisabled: { opacity: 0.45 },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(58,173,255,0.08)',
  },
  actionCopy: { flex: 1, minWidth: 0, gap: 2 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  actionSub: { fontSize: 12, color: colors.textDim, lineHeight: 16 },
  logPanel: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    gap: 6,
  },
  logTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  logMessage: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  logClearBtn: { alignSelf: 'flex-start', marginTop: 2 },
  logClearText: { fontSize: 13, fontWeight: '600', color: '#FF5A5A' },
});
}

function createTrStyles(colors: AppColors) {
  return StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  text: { flex: 1, paddingRight: 16 },
  label: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 2 },
  sub: { fontSize: 12.5, color: colors.textDim, lineHeight: 17 },
});
}

function createModalStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  step: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  instruction: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  qrWrap: { backgroundColor: colors.surfaceHover, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center', gap: 6 },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  manualKey: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 3, textAlign: 'center' },
  manualKeyNote: { fontSize: 11, color: colors.textDim, textAlign: 'center' },
  codeInput: { height: 64, backgroundColor: colors.surfaceHover, borderRadius: 16, borderWidth: 1, borderColor: colors.border, fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: 10 },
  error: { fontSize: 13, color: '#FF5A5A', textAlign: 'center' },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)', padding: 14 },
  warnText: { flex: 1, fontSize: 13.5, color: '#FFC107', lineHeight: 20 },
  disableBtn: { height: 52, borderRadius: 14, backgroundColor: 'rgba(255,90,90,0.2)', borderWidth: 1, borderColor: 'rgba(255,90,90,0.4)', alignItems: 'center', justifyContent: 'center' },
  disableBtnText: { fontSize: 15, fontWeight: '800', color: '#FF5A5A' },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  codeChip: { backgroundColor: colors.surfaceHover, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  codeChipText: { fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  headerSafe: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  back: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  pwCardInner: { padding: 16, gap: 0 },
  twoFARow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  twoFAInfo: { flex: 1 },
  twoFALabel: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 2 },
  twoFASub: { fontSize: 12.5, color: colors.textDim, lineHeight: 17 },
  twoFAError: { fontSize: 12, color: '#FF5A5A', marginTop: 4 },
  twoFABtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary, minWidth: 70, alignItems: 'center' },
  twoFABtnOff: { backgroundColor: 'rgba(255,90,90,0.15)', borderColor: 'rgba(255,90,90,0.35)' },
  twoFABtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryForeground },
  twoFABtnTextOff: { fontSize: 13, fontWeight: '700', color: '#FF5A5A' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,90,90,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 13, color: '#FF5A5A' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  successText: { flex: 1, fontSize: 13, color: '#4ADE80' },
  bgHint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18, paddingHorizontal: 14, paddingTop: 6 },
  bgSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  modeChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeChipTextActive: { color: colors.primaryForeground, fontWeight: '700' },
});
}
