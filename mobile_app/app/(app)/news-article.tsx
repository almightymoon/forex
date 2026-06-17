import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../constants/theme';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export default function NewsArticleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string; source?: string }>();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const url = typeof params.url === 'string' ? params.url : Array.isArray(params.url) ? params.url[0] : '';
  const title = typeof params.title === 'string' ? params.title : Array.isArray(params.title) ? params.title[0] : 'Article';
  const source = typeof params.source === 'string' ? params.source : Array.isArray(params.source) ? params.source[0] : '';

  if (!url) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={() => router.back()}>
              <View style={styles.backIcon}>
                <AppIcon name="chevron-right" size={20} color={colors.text} strokeWidth={2.2} />
              </View>
            </Pressable>
            <Text style={styles.pageTitle}>Article unavailable</Text>
            <View style={styles.iconBtnPlaceholder} />
          </View>
        </SafeAreaView>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>This article link is missing or invalid.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => (canGoBack ? webRef.current?.goBack() : router.back())}>
            <View style={styles.backIcon}>
              <AppIcon name="chevron-right" size={20} color={colors.text} strokeWidth={2.2} />
            </View>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
            {source ? <Text style={styles.subtitle} numberOfLines={1}>{source}</Text> : null}
          </View>
          <Pressable style={styles.iconBtn} onPress={() => webRef.current?.reload()}>
            <AppIcon name="activity" size={18} color={colors.cyan} strokeWidth={2} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.webWrap}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.cyan} size="large" />
            <Text style={styles.loaderText}>Loading article…</Text>
          </View>
        ) : null}
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={styles.webview}
          userAgent={MOBILE_UA}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          startInLoadingState={false}
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#060b18' },
  headerSafe: { backgroundColor: '#060b18' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  titleBlock: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 11, fontWeight: '600', color: colors.cyan, marginTop: 2 },
  webWrap: { flex: 1, backgroundColor: '#060b18' },
  webview: { flex: 1, backgroundColor: '#060b18' },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#060b18',
    zIndex: 2,
  },
  loaderText: { fontSize: 13, color: colors.textMuted },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
