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
  title = 'Receipt preview',
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
    <div className="receipt-preview-overlay" onClick={onClose}>
      <div className="receipt-preview" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-preview__head">
          <div className="min-w-0">
            <h3 className="receipt-preview__title">{title}</h3>
            <p className="receipt-preview__filename">{resolvedFilename}</p>
          </div>
          <div className="receipt-preview__actions">
            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={downloading || loading || !!error}
              className="receipt-preview__btn receipt-preview__btn--primary"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download PDF
            </button>
            <button type="button" onClick={onClose} className="receipt-preview__close" aria-label="Close preview">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="receipt-preview__frame">
          {loading ? (
            <div className="receipt-preview__loading">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading document…
            </div>
          ) : error ? (
            <div className="receipt-preview__error">{error}</div>
          ) : pdfUrl ? (
            <iframe title={title} src={pdfUrl} />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
