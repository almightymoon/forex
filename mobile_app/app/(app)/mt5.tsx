import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/AuthInput';
import { GradientButton } from '../../components/GradientButton';
import { apiFetch } from '../../utils/api';
import { hapticSuccess } from '../../utils/haptics';

interface MT5Account {
  _id: string;
  mt5Login: number;
  mt5Server: string;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  profit?: number;
  isVerified?: boolean;
  copyTradingEnabled?: boolean;
}

interface Position {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  profit: number;
  openPrice: number;
}

export default function MT5Screen() {
  const router = useRouter();
  const [account, setAccount] = useState<MT5Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [accRes, posRes] = await Promise.all([
        apiFetch('api/mt5/account'),
        apiFetch('api/mt5/positions'),
      ]);
      if (accRes.ok) {
        setAccount(await accRes.json());
        setShowConnect(false);
      } else if (accRes.status === 404) {
        setAccount(null);
        setShowConnect(true);
      }
      if (posRes.ok) {
        const d = await posRes.json();
        setPositions(Array.isArray(d) ? d : d.positions ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConnect = async () => {
    if (!login.trim() || !password.trim() || !server.trim()) {
      setError('All fields are required.');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const res = await apiFetch('api/mt5/connect', {
        method: 'POST',
        body: JSON.stringify({
          mt5Login: login.trim(),
          mt5Password: password.trim(),
          mt5Server: server.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        await hapticSuccess();
        setPassword('');
        fetchData();
      } else {
        setError((d as { error?: string; message?: string }).error ?? (d as { message?: string }).message ?? 'Connection failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const fmt = (n?: number) => (n != null ? `$${Number(n).toFixed(2)}` : '—');

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>MT5 Trading</Text>
          <Pressable style={styles.refreshBtn} onPress={() => { setRefreshing(true); fetchData(); }}>
            <Ionicons name="refresh-outline" size={18} color="#3AADFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#3AADFF" />}
      >
        {loading ? (
          <ActivityIndicator color="#3AADFF" style={{ marginTop: 60 }} />
        ) : showConnect || !account ? (
          <View style={styles.connectCard}>
            <View style={styles.connectIcon}>
              <Ionicons name="link-outline" size={36} color="#3AADFF" />
            </View>
            <Text style={styles.connectTitle}>Connect MT5 Account</Text>
            <Text style={styles.connectSub}>Link your MetaTrader 5 account to view balance, equity, and open positions.</Text>
            <AuthInput label="MT5 Login" icon="key-outline" placeholder="Account number" value={login} onChangeText={setLogin} keyboardType="numeric" />
            <AuthInput label="MT5 Password" icon="lock-closed-outline" placeholder="Investor or main password" value={password} onChangeText={setPassword} secureTextEntry />
            <AuthInput label="MT5 Server" icon="server-outline" placeholder="e.g. MetaQuotes-Demo" value={server} onChangeText={setServer} autoCapitalize="none" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <GradientButton title="Connect Account" loading={connecting} onPress={handleConnect} />
          </View>
        ) : (
          <>
            <LinearGradient colors={['rgba(0,96,230,0.3)', 'rgba(255,255,255,0.03)']} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View>
                  <Text style={styles.accountLabel}>MT5 Account</Text>
                  <Text style={styles.accountLogin}>#{account.mt5Login}</Text>
                  <Text style={styles.accountServer}>{account.mt5Server}</Text>
                </View>
                {account.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
                    <Text style={styles.verifiedText}>Connected</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.statsGrid}>
                <StatBox label="Balance" value={fmt(account.balance)} />
                <StatBox label="Equity" value={fmt(account.equity)} />
                <StatBox label="Margin" value={fmt(account.margin)} />
                <StatBox label="Free Margin" value={fmt(account.freeMargin)} />
              </View>
              {account.profit != null ? (
                <Text style={[styles.profitText, account.profit >= 0 ? styles.profitUp : styles.profitDown]}>
                  Floating P/L: {fmt(account.profit)}
                </Text>
              ) : null}
            </LinearGradient>

            <Text style={styles.sectionTitle}>Open Positions ({positions.length})</Text>
            {positions.length === 0 ? (
              <View style={styles.emptyPos}>
                <Ionicons name="analytics-outline" size={32} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyPosText}>No open positions</Text>
              </View>
            ) : (
              positions.map((p) => (
                <View key={p.ticket} style={styles.posCard}>
                  <View style={styles.posHeader}>
                    <Text style={styles.posSymbol}>{p.symbol}</Text>
                    <View style={[styles.posType, { backgroundColor: p.type?.toLowerCase().includes('buy') ? 'rgba(74,222,128,0.15)' : 'rgba(255,90,90,0.15)' }]}>
                      <Text style={[styles.posTypeText, { color: p.type?.toLowerCase().includes('buy') ? '#4ADE80' : '#FF5A5A' }]}>{p.type}</Text>
                    </View>
                  </View>
                  <View style={styles.posMeta}>
                    <Text style={styles.posMetaText}>Vol: {p.volume}</Text>
                    <Text style={styles.posMetaText}>@ {p.openPrice}</Text>
                    <Text style={[styles.posProfit, p.profit >= 0 ? styles.profitUp : styles.profitDown]}>
                      {p.profit >= 0 ? '+' : ''}{Number(p.profit).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Pressable
              style={styles.reconnectBtn}
              onPress={() => { setShowConnect(true); setAccount(null); }}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="#3AADFF" />
              <Text style={styles.reconnectText}>Reconnect different account</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={stat.box}>
      <Text style={stat.label}>{label}</Text>
      <Text style={stat.value}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  box: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, gap: 2 },
  label: { fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  headerSafe: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  refreshBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,96,230,0.15)', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  connectCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', padding: 20, gap: 4, alignItems: 'stretch' },
  connectIcon: { width: 70, height: 70, borderRadius: 20, backgroundColor: 'rgba(0,96,230,0.15)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8 },
  connectTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  connectSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  error: { fontSize: 13, color: '#FF5A5A', marginBottom: 8 },
  accountCard: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(58,173,255,0.2)', padding: 18, gap: 14 },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  accountLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' },
  accountLogin: { fontSize: 22, fontWeight: '900', color: '#fff' },
  accountServer: { fontSize: 12.5, color: 'rgba(255,255,255,0.45)' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#4ADE80' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profitText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  profitUp: { color: '#4ADE80' },
  profitDown: { color: '#FF5A5A' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  emptyPos: { alignItems: 'center', padding: 24, gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16 },
  emptyPosText: { fontSize: 13.5, color: 'rgba(255,255,255,0.35)' },
  posCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', padding: 14, gap: 8 },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  posSymbol: { fontSize: 15, fontWeight: '800', color: '#fff' },
  posType: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  posTypeText: { fontSize: 11, fontWeight: '700' },
  posMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posMetaText: { fontSize: 12.5, color: 'rgba(255,255,255,0.45)' },
  posProfit: { marginLeft: 'auto', fontSize: 14, fontWeight: '800' },
  reconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  reconnectText: { fontSize: 13.5, fontWeight: '600', color: '#3AADFF' },
});
