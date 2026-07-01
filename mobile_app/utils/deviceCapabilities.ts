import { Platform } from 'react-native';

/** Real backdrop blur — stable on iOS; Android uses simulated frost instead. */
export function useNativeBlur(): boolean {
  return Platform.OS === 'ios';
}

/** Cards get native blur on both platforms (shell / tab bar stay frost-only on Android). */
export function useCardNativeBlur(): boolean {
  return true;
}

export function useLightweightGraphics(): boolean {
  return Platform.OS === 'android';
}

export function shouldSkipWebGlBackground(): boolean {
  return Platform.OS === 'android';
}
