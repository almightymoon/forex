'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import ReceiptDownloadButton from './ReceiptDownloadButton';
import ReceiptPreviewModal from './ReceiptPreviewModal';

type Props = {
  endpoint: string;
  filename: string;
  label?: string;
  previewTitle?: string;
  className?: string;
  downloadClassName?: string;
  viewClassName?: string;
  iconOnly?: boolean;
  title?: string;
};

const defaultDownloadClass =
  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50';

const defaultViewClass =
  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50';

const defaultIconViewClass =
  'p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50';

const defaultIconDownloadClass =
  'p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50';

export default function ReceiptActions({
  endpoint,
  filename,
  label = 'Download',
  previewTitle,
  className = '',
  downloadClassName,
  viewClassName,
  iconOnly = false,
  title
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const viewBtnClass = viewClassName || (iconOnly ? defaultIconViewClass : defaultViewClass);
  const downloadBtnClass = downloadClassName || className || (iconOnly ? defaultIconDownloadClass : defaultDownloadClass);

  return (
    <>
      <div className={`inline-flex items-center ${iconOnly ? 'gap-0.5' : 'gap-2'}`}>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          title={title ? `View ${title}` : 'View receipt'}
          className={viewBtnClass}
        >
          <Eye className="h-4 w-4" />
          {!iconOnly ? <span>View</span> : null}
        </button>
        <ReceiptDownloadButton
          endpoint={endpoint}
          filename={filename}
          label={label}
          iconOnly={iconOnly}
          title={title ? `Download ${title}` : 'Download receipt'}
          className={downloadBtnClass}
        />
      </div>

      <ReceiptPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        endpoint={endpoint}
        filename={filename}
        title={previewTitle || title || 'Receipt preview'}
      />
    </>
  );
}
