'use client';

import { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadReceipt } from '../utils/downloadFile';

type Props = {
  endpoint: string;
  filename: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
  title?: string;
};

export default function ReceiptDownloadButton({
  endpoint,
  filename,
  label = 'Download',
  className = '',
  iconOnly = false,
  title
}: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    setBusy(true);
    try {
      await downloadReceipt(endpoint, filename);
    } finally {
      setBusy(false);
    }
  }, [endpoint, filename]);

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      title={title || label}
      className={
        className ||
        'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
      }
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {!iconOnly ? <span>{busy ? 'Downloading…' : label}</span> : null}
    </button>
  );
}
