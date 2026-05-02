import { API_BASE_URL } from '../utils/api';

/** Turns `/uploads/...` into an absolute URL against the API origin; passes through https URLs. */
export function resolveBackendAssetUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE_URL.replace(/\/api\/?$/i, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${path}`;
}
