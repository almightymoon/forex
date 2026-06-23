/** Prevents Android WebView renderer crashes from taking down the whole app. */
export const WEBVIEW_CRASH_GUARD = {
  onRenderProcessGone: () => true,
  onError: () => {},
  onHttpError: () => {},
} as const;
