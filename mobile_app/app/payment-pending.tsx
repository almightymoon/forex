import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '../components/ScreenBackground';
import { apiFetch } from '../utils/api';
import { clearAuth, resolvePostLoginRoute } from '../utils/auth';

const POLL_INTERVAL_MS = 12000; // check every 12 seconds

export default function PaymentPendingScreen() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(1)).current;
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  // Poll payment status — auto-redirect when admin approves
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      try {
        const res = await apiFetch('api/payments/user');
        if (!res.ok) return;
        const raw = await res.json();
        const payments: Array<{ type?: string; status: string }> =
          Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        const hasCompleted = payments.some((p) => (!p.type || p.type === 'package') && p.status === 'completed');
        setLastChecked(new Date());
        setCheckCount((c) => c + 1);
        if (hasCompleted && !cancelled) {
          const route = await resolvePostLoginRoute();
          router.replace(route as any);
        }
      } catch { /* ignore — will retry */ }
      finally { if (!cancelled) setChecking(false); }
    };
    check(); // immediate first check
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/auth');
  };

  return (
    <ScreenBackground variant="auth">
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Pulsing icon */}
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
            <LinearGradient
              colors={['rgba(0,96,230,0.25)', 'rgba(58,173,255,0.15)']}
              style={styles.iconGradient}
            >
              <Ionicons name="time-outline" size={52} color="#3AADFF" />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Payment Under Review</Text>
          <Text style={styles.subtitle}>
            Your payment proof has been submitted. Our team is reviewing it and will approve your account within 24 hours.
          </Text>

          {/* Status steps */}
          <View style={styles.stepsCard}>
            <Step icon="checkmark-circle" color="#4ADE80" label="Payment proof submitted" done />
            <View style={styles.stepDivider} />
            <Step icon="time-outline" color="#3AADFF" label="Admin review in progress" active />
            <View style={styles.stepDivider} />
            <Step icon="lock-closed-outline" color="rgba(255,255,255,0.25)" label="Account activation" />
          </View>

          <Text style={styles.note}>
            You'll receive access to all features once your payment is confirmed. If you need help, contact us via Telegram.
          </Text>

          <View style={styles.checkingRow}>
            {checking ? (
              <>
                <Ionicons name="sync-outline" size={14} color="#3AADFF" />
                <Text style={styles.checkingText}>Checking approval status…</Text>
              </>
            ) : lastChecked ? (
              <Text style={styles.checkingText}>
                Last checked {lastChecked.toLocaleTimeString()} · Auto-check #{checkCount}
              </Text>
            ) : (
              <Text style={styles.checkingText}>Waiting for first status check…</Text>
            )}
          </View>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.4)" />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Step({ icon, color, label, done, active }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <View style={stepStyles.row}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[stepStyles.label, done && stepStyles.done, active && stepStyles.active]}>
        {label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.3)', flex: 1 },
  done: { color: '#4ADE80' },
  active: { color: '#fff', fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.3)',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 18,
    gap: 14,
    marginBottom: 24,
  },
  stepDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 34,
  },
  note: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  checkingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
});
