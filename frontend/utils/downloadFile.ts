import { buildApiUrl } from './api';
import { showToast } from './toast';

/**
 * Download an authenticated API file (PDF receipts, etc.) via blob + object URL.
 */
export async function downloadAuthenticatedFile(endpoint: string, fallbackFilename: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    throw new Error('Not signed in');
  }

  const res = await fetch(buildApiUrl(endpoint), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(err.error || 'Download failed');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] || fallbackFilename;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadReceipt(endpoint: string, fallbackFilename: string): Promise<boolean> {
  try {
    await downloadAuthenticatedFile(endpoint, fallbackFilename);
    return true;
  } catch (e) {
    showToast(e instanceof Error ? e.message : 'Could not download receipt', 'error');
    return false;
  }
}
