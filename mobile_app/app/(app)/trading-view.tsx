import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { glassScreenStyles } from '../../components/glass/glassScreenStyles';
import { WEBVIEW_CRASH_GUARD } from '../../utils/webviewCrashGuard';

const SYMBOLS = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:AUDUSD', 'FX:USDCAD', 'FX:XAUUSD'];
const INTERVALS = ['1', '5', '15', '60', '240', 'D'];
const INTERVAL_LABELS: Record<string, string> = { '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1D' };

function buildChartHtml(symbol: string, interval: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #010A18; overflow: hidden; }
    #chart { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
    new TradingView.widget({
      container_id: 'chart',
      symbol: '${symbol}',
      interval: '${interval}',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#010A18',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      withdateranges: true,
      allow_symbol_change: true,
      width: '100%',
      height: '100%',
    });
  </script>
</body>
</html>`;
}

export default function TradingViewScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [symbol, setSymbol] = useState('FX:EURUSD');
  const [interval, setInterval] = useState('60');
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  const applySymbol = (s: string) => {
    setSymbol(s);
    setKey((k) => k + 1);
    setLoading(true);
  };

  const applyInterval = (i: string) => {
    setInterval(i);
    setKey((k) => k + 1);
    setLoading(true);
  };

  return (
    <View style={glassScreenStyles.screen}>
      <SafeAreaView edges={['top']} style={glassScreenStyles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Live Charts</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Symbol selector */}
      <View style={styles.selectorWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SYMBOLS.map((s) => {
            const label = s.replace('FX:', '').replace('XAUUSD', 'XAU/USD').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
            return (
              <Pressable
                key={s}
                style={[styles.chip, symbol === s && styles.chipActive]}
                onPress={() => applySymbol(s)}
              >
                <Text style={[styles.chipText, symbol === s && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Interval selector */}
      <View style={styles.intervalRow}>
        {INTERVALS.map((i) => (
          <Pressable
            key={i}
            style={[styles.intChip, interval === i && styles.intChipActive]}
            onPress={() => applyInterval(i)}
          >
            <Text style={[styles.intText, interval === i && styles.intTextActive]}>
              {INTERVAL_LABELS[i]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartWrap}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#3AADFF" size="large" />
            <Text style={styles.loadingText}>Loading chart…</Text>
          </View>
        )}
        <WebView
          key={key}
          ref={webRef}
          source={{ html: buildChartHtml(symbol, interval) }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setLoading(false)}
          originWhitelist={['*']}
          {...WEBVIEW_CRASH_GUARD}
          userAgent={
            Platform.OS === 'android'
              ? 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
              : undefined
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  selectorWrap: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  chips: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: 'rgba(0,96,230,0.3)', borderColor: '#3AADFF' },
  chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  chipTextActive: { color: '#3AADFF', fontWeight: '800' },
  intervalRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  intChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  intChipActive: { backgroundColor: 'rgba(58,173,255,0.2)' },
  intText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  intTextActive: { color: '#3AADFF', fontWeight: '800' },
  chartWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: '#010A18' },
  loadingOverlay: { position: 'absolute', inset: 0, backgroundColor: '#010A18', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10 },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
});
