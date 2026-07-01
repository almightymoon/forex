import { useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ExploreScreenHeader } from '../../components/explore/ExploreScreenHeader';
import { createExploreChipStyles } from '../../components/explore/exploreStyles';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { WEBVIEW_CRASH_GUARD } from '../../utils/webviewCrashGuard';

const SYMBOLS = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:AUDUSD', 'FX:USDCAD', 'FX:XAUUSD'];
const INTERVALS = ['1', '5', '15', '60', '240', 'D'];
const INTERVAL_LABELS: Record<string, string> = { '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1D' };

function formatPairLabel(symbol: string) {
  const raw = symbol.replace('FX:', '');
  if (raw === 'XAUUSD') return 'XAU/USD';
  return raw.replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
}

function buildChartHtml(symbol: string, interval: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #F4F4F5; overflow: hidden; }
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
      theme: 'light',
      style: '1',
      locale: 'en',
      toolbar_bg: '#FFFFFF',
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const exploreChipStyles = useMemo(() => createExploreChipStyles(colors), [colors]);
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
    <View style={styles.screen}>
      <ExploreScreenHeader
        showBack
        eyebrow="Markets"
        title="Live Charts"
        subtitle={`${formatPairLabel(symbol)} · ${INTERVAL_LABELS[interval]} timeframe`}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SYMBOLS.map((s) => {
            const active = symbol === s;
            return (
              <Pressable
                key={s}
                style={[exploreChipStyles.chip, active && exploreChipStyles.chipActive]}
                onPress={() => applySymbol(s)}
              >
                <Text style={[exploreChipStyles.chipText, active && exploreChipStyles.chipTextActive]}>
                  {formatPairLabel(s)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.intervalRow}>
          {INTERVALS.map((i) => {
            const active = interval === i;
            return (
              <Pressable
                key={i}
                style={[styles.intChip, active && styles.intChipActive]}
                onPress={() => applyInterval(i)}
              >
                <Text style={[styles.intText, active && styles.intTextActive]}>
                  {INTERVAL_LABELS[i]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ExploreScreenHeader>

      <View style={styles.chartWrap}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.black} size="large" />
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  chips: { gap: 8, paddingBottom: 4 },
  intervalRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  intChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  intText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  intTextActive: { color: colors.primaryForeground, fontWeight: '800' },
  chartWrap: { flex: 1, position: 'relative', borderTopWidth: 1, borderTopColor: colors.border },
  webview: { flex: 1, backgroundColor: colors.background },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: { fontSize: 14, color: colors.textMuted },
});
}
