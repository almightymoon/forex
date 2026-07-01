'use client';

import Link from 'next/link';
import {
  BookOpen,
  Download,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  getLibraryAssetUrl,
  RESOURCE_TYPE_LABELS,
  type LibraryItem,
} from '../../lib/publicLibrary';

type LibraryItemDetailViewProps = {
  item: LibraryItem;
  backHref: string;
  loginRedirectPath?: string;
};

function resourceUrl(item: LibraryItem): string {
  return item.externalUrl || item.fileUrl || '';
}

function openLabel(item: LibraryItem): string {
  if (item.fileUrl) return 'Download file';
  if (item.resourceType === 'google_sheet') return 'Open Google Sheet';
  if (item.resourceType === 'book') return 'View book list';
  if (item.resourceType === 'video') return 'Watch video';
  return 'Open link';
}

export default function LibraryItemDetailView({
  item,
  backHref,
  loginRedirectPath,
}: LibraryItemDetailViewProps) {
  const url = resourceUrl(item);

  const handleOpen = () => {
    if (!url) return;
    window.open(getLibraryAssetUrl(url), '_blank', 'noopener,noreferrer');
  };

  const lockedMessage = item.packageLabel
    ? `This resource is included with: ${item.packageLabel}. Your current package does not include access.`
    : 'This resource is not included with your current package.';

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
      >
        ← Back to library
      </Link>

      <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            {RESOURCE_TYPE_LABELS[item.resourceType]}
          </span>
          {item.category ? (
            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {item.category}
            </span>
          ) : null}
          <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            {item.packageLabel || 'All packages'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
        {item.author ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">By {item.author}</p>
        ) : null}
        {item.description ? (
          <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">{item.description}</p>
        ) : null}

        {item.tags && item.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gray-200 dark:border-gray-600 px-2.5 py-1 text-xs text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {item.hasAccess && url ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleOpen}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {item.fileUrl ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {openLabel(item)}
            </button>
          </div>
        ) : item.locked ? (
          <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Lock className="h-4 w-4" />
              Resource locked
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{lockedMessage}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/packages" className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                View packages
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-500">No file or link attached yet.</p>
        )}
      </article>
    </div>
  );
}

export function LibraryItemLoading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

export function LibraryItemNotFound({ backHref }: { backHref: string }) {
  return (
    <div className="py-16 text-center">
      <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Resource not found</h1>
      <p className="mb-6 text-gray-500">This item may have been removed or is not published.</p>
      <Link href={backHref} className="text-sm font-semibold text-blue-600 hover:underline">
        ← Back to library
      </Link>
    </div>
  );
}
