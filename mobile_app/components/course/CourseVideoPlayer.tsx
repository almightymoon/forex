import { useVideoPlayer, VideoView } from 'expo-video';
import { memo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { WEBVIEW_CRASH_GUARD } from '../../utils/webviewCrashGuard';

export type VideoPlaybackSpec =
  | { kind: 'embed'; html: string; baseUrl: string }
  | { kind: 'native'; uri: string }
  | { kind: 'webview'; uri: string }
  | { kind: 'external'; uri: string; label: string };

const VIDEO_FILE_RE = /\.(mp4|m3u8|mov|webm|m4v|ogg)(\?|#|$)/i;

function buildIframeEmbedHtml(embedUrl: string): string {
  const safe = embedUrl.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<iframe
  src="${safe}"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
  allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
</body>
</html>`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([^&\s?#/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Pick the best in-app playback strategy for a lesson video URL. */
export function buildVideoPlaybackSpec(url: string): VideoPlaybackSpec {
  const u = url.toLowerCase();

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    const embedUrl =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}` +
      '?playsinline=1&rel=0&modestbranding=1&fs=1';
    return {
      kind: 'embed',
      html: buildIframeEmbedHtml(embedUrl),
      baseUrl: 'https://www.youtube-nocookie.com',
    };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&playsinline=1`;
    return {
      kind: 'embed',
      html: buildIframeEmbedHtml(embedUrl),
      baseUrl: 'https://player.vimeo.com',
    };
  }

  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([^_?\s/]+)/);
  if (dailymotionMatch) {
    const embedUrl = `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=0`;
    return {
      kind: 'embed',
      html: buildIframeEmbedHtml(embedUrl),
      baseUrl: 'https://www.dailymotion.com',
    };
  }

  if (u.includes('zoom.us/')) {
    return { kind: 'webview', uri: url };
  }

  if (VIDEO_FILE_RE.test(u) || u.includes('/uploads/') || u.includes('/media/')) {
    return { kind: 'native', uri: url };
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { kind: 'native', uri: url };
  }

  return { kind: 'external', uri: url, label: 'Open video' };
}

const WEBVIEW_PROPS = {
  allowsFullscreenVideo: true as const,
  allowsInlineMediaPlayback: true as const,
  mediaPlaybackRequiresUserAction: false as const,
  javaScriptEnabled: true as const,
  domStorageEnabled: true as const,
  scrollEnabled: false as const,
  setSupportMultipleWindows: false as const,
  ...WEBVIEW_CRASH_GUARD,
};

const NativeLessonVideo = memo(function NativeLessonVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.player}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
      contentFit="contain"
    />
  );
});

type Props = {
  spec: VideoPlaybackSpec;
};

export const CourseVideoPlayer = memo(function CourseVideoPlayer({ spec }: Props) {
  if (spec.kind === 'native') {
    return (
      <View style={styles.wrap}>
        <NativeLessonVideo key={spec.uri} uri={spec.uri} />
      </View>
    );
  }

  if (spec.kind === 'embed') {
    return (
      <View style={styles.wrap}>
        <WebView
          source={{ html: spec.html, baseUrl: spec.baseUrl }}
          style={styles.player}
          {...WEBVIEW_PROPS}
          originWhitelist={['*']}
        />
      </View>
    );
  }

  if (spec.kind === 'webview') {
    return (
      <View style={styles.wrap}>
        <WebView source={{ uri: spec.uri }} style={styles.player} {...WEBVIEW_PROPS} />
      </View>
    );
  }

  return (
    <View style={styles.fallback}>
      <Ionicons name="play-circle-outline" size={44} color="rgba(58,173,255,0.5)" />
      <Pressable style={styles.openBtn} onPress={() => Linking.openURL(spec.uri)}>
        <Ionicons name="open-outline" size={14} color="#3AADFF" />
        <Text style={styles.openBtnText}>{spec.label}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.4)',
    backgroundColor: 'rgba(0,96,230,0.12)',
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3AADFF',
  },
});
