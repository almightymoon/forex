import { Asset } from 'expo-asset';

/** Same paths as thefxnavigators.com — reliable in WebView WebGL */
export const GLOBE_CDN = {
  dark: 'https://thefxnavigators.com/globe-textures/earth-dark.jpg',
  night: 'https://thefxnavigators.com/globe-textures/earth-night.jpg',
  bump: 'https://thefxnavigators.com/globe-textures/earth-topology.png',
} as const;

export type GlobeTextureUris = {
  dark: string;
  night: string;
  bump: string;
};

export async function loadGlobeTextureUris(): Promise<GlobeTextureUris> {
  try {
    const [darkA, nightA, bumpA] = await Promise.all([
      Asset.fromModule(require('../../assets/images/globe-earth-dark.jpg')).downloadAsync(),
      Asset.fromModule(require('../../assets/images/globe-earth-night.jpg')).downloadAsync(),
      Asset.fromModule(require('../../assets/images/globe-earth-topology.png')).downloadAsync(),
    ]);
    return {
      dark: darkA.localUri ?? darkA.uri,
      night: nightA.localUri ?? nightA.uri,
      bump: bumpA.localUri ?? bumpA.uri,
    };
  } catch {
    return { ...GLOBE_CDN };
  }
}

/** URIs passed into WebView — CDN first (CORS-safe), local as read-access root */
export async function loadGlobeWebViewTextures(): Promise<GlobeTextureUris & { readAccessDir?: string }> {
  const local = await loadGlobeTextureUris();
  return {
    dark: GLOBE_CDN.dark,
    night: GLOBE_CDN.night,
    bump: GLOBE_CDN.bump,
    readAccessDir: local.dark.includes('file://') ? local.dark : undefined,
  };
}
