import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { buildAuthGlobeHtml, getAuthGlobeLayout } from './authGlobeHtml';
import { loadGlobeWebViewTextures, type GlobeTextureUris } from './globeTextures';
import { shouldSkipWebGlBackground } from '../../utils/deviceCapabilities';
import { WEBVIEW_CRASH_GUARD } from '../../utils/webviewCrashGuard';

/** Rotating website globe — bottom horizon semicircle (Figma) */
export function AnimatedGlobeBackground() {
  const skipWebGl = shouldSkipWebGlBackground();
  const { width, height } = useWindowDimensions();
  const { arcVisible, webviewHeight, webviewOffset } = useMemo(
    () => getAuthGlobeLayout(height),
    [height],
  );
  const [textures, setTextures] = useState<(GlobeTextureUris & { readAccessDir?: string }) | null>(
    null,
  );
  const [html, setHtml] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (skipWebGl) return;
    let mounted = true;
    loadGlobeWebViewTextures()
      .then((uris) => {
        if (!mounted) return;
        setTextures(uris);
        setHtml(
          buildAuthGlobeHtml(uris, {
            width,
            height: webviewHeight,
            reduceMotion,
          }),
        );
      })
      .catch(() => {
        if (mounted) setHtml(null);
      });
    return () => {
      mounted = false;
    };
  }, [width, webviewHeight, reduceMotion, skipWebGl]);

  if (skipWebGl) {
    return (
      <View style={styles.root} pointerEvents="none">
        <LinearGradient
          colors={['#000000', '#040818', '#0a1830', '#000000']}
          locations={[0, 0.45, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Clip at screen bottom — show the lower slice where the earth limb renders */}
      <View style={[styles.arcClip, { width, height: arcVisible }]}>
        {html ? (
          <WebView
            source={{ html }}
            scrollEnabled={false}
            bounces={false}
            pointerEvents="none"
            originWhitelist={['*']}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={textures?.readAccessDir}
            mixedContentMode="always"
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="software"
            style={[
              styles.webview,
              {
                width,
                height: webviewHeight,
                marginTop: -webviewOffset,
              },
            ]}
            setSupportMultipleWindows={false}
            {...WEBVIEW_CRASH_GUARD}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="rgba(58,173,255,0.5)" />
          </View>
        )}
      </View>

      {/* Top fade — keep form readable; earth stays visible in bottom arc */}
      <LinearGradient
        colors={[
          '#000000',
          '#000000',
          'rgba(0,0,0,0.94)',
          'rgba(0,0,0,0.72)',
          'rgba(0,0,0,0.28)',
          'transparent',
        ]}
        locations={[0, 0.38, 0.5, 0.62, 0.78, 0.92]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Cyan atmosphere on the horizon line */}
      <LinearGradient
        colors={['transparent', 'rgba(58,173,255,0.32)', 'rgba(0,212,255,0.14)', 'transparent']}
        locations={[0, 0.4, 0.65, 1]}
        style={[styles.horizonGlow, { bottom: arcVisible - 20, height: 52 }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  arcClip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: '#000000',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
