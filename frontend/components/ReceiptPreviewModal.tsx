'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { downloadAuthenticatedFile, fetchAuthenticatedFile } from '../utils/downloadFile';
import { showToast } from '../utils/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  endpoint: string;
  filename: string;
  title?: string;
};

export default function ReceiptPreviewModal({
  open,
  onClose,
  endpoint,
  filename,
  title = 'Receipt preview'
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resolvedFilename, setResolvedFilename] = useState(filename);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      setPdfUrl(null);

      try {
        const { blob, filename: resolved } = await fetchAuthenticatedFile(endpoint, filename);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedFilename(resolved);
        setPdfUrl(objectUrl);
      } catch (e) {
        if (!alive) return;
        const message = e instanceof Error ? e.message : 'Could not load receipt';
        setError(message);
        showToast(message, 'error');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, endpoint, filename]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const onDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadAuthenticatedFile(endpoint, resolvedFilename);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not download receipt', 'error');
    } finally {
      setDownloading(false);
    }
  }, [endpoint, resolvedFilename]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{resolvedFilename}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={downloading || loading || !!error}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-gray-100 dark:bg-gray-950">
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              <Loader2 className="mr-2 h-8 w-8 animate-spin" />
              Loading receipt…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : pdfUrl ? (
            <iframe
              title={title}
              src={pdfUrl}
              className="h-full w-full border-0 bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
