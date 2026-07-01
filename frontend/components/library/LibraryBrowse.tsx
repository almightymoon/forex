'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Search,
  Video,
} from 'lucide-react';
import {
  fetchPublicLibraryItems,
  getLibraryAssetUrl,
  RESOURCE_TYPE_LABELS,
  type LibraryItem,
  type LibraryResourceType,
} from '../../lib/publicLibrary';

const TYPE_FILTERS: { id: LibraryResourceType | ''; label: string }[] = [
  { id: '', label: 'All types' },
  { id: 'google_sheet', label: 'Sheets' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'document', label: 'Docs' },
  { id: 'link', label: 'Links' },
  { id: 'book', label: 'Books' },
  { id: 'video', label: 'Videos' },
];

function TypeIcon({ type }: { type: LibraryResourceType }) {
  const cls = 'h-10 w-10 text-blue-500';
  switch (type) {
    case 'google_sheet':
      return <FileSpreadsheet className={cls} aria-hidden />;
    case 'pdf':
    case 'document':
      return <FileText className={cls} aria-hidden />;
    case 'book':
      return <BookOpen className={cls} aria-hidden />;
    case 'video':
      return <Video className={cls} aria-hidden />;
    default:
      return <Link2 className={cls} aria-hidden />;
  }
}

type LibraryBrowseProps = {
  /** e.g. `/dashboard/library` or `/teacher/library` */
  itemBasePath: string;
};

function LibraryCard({ item, itemBasePath }: { item: LibraryItem; itemBasePath: string }) {
  return (
    <Link
      href={`${itemBasePath}/${item.itemId}`}
      className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
        {item.coverImage ? (
          <img src={getLibraryAssetUrl(item.coverImage)} alt="" className="h-full w-full object-cover" />
        ) : (
          <TypeIcon type={item.resourceType} />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-gray-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {RESOURCE_TYPE_LABELS[item.resourceType]}
          </span>
          {item.locked ? (
            <span className="rounded-full bg-amber-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Locked
            </span>
          ) : item.packageLabel && item.packageLabel !== 'All packages' ? (
            <span className="rounded-full bg-indigo-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {item.packageLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {item.category ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {item.category}
          </span>
        ) : null}
        <h3 className="font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {item.title}
        </h3>
        {item.description ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
        ) : null}
        <p className="mt-auto pt-2 text-xs text-gray-400">{item.author || 'FX Navigators'}</p>
      </div>
    </Link>
  );
}

export default function LibraryBrowse({ itemBasePath }: LibraryBrowseProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [typeFilter, setTypeFilter] = useState<LibraryResourceType | ''>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchPublicLibraryItems({
        category: category || undefined,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
      });
      if (!alive) return;
      setItems(data.items);
      setCategories(data.categories);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [category, debouncedSearch, typeFilter]);

  const hasFilters = Boolean(category || debouncedSearch || typeFilter);

  const emptyMessage = useMemo(() => {
    if (hasFilters) return 'No resources match your filters.';
    return 'No library resources yet. Check back soon.';
  }, [hasFilters]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Library</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Google Sheets, PDFs, books, and curated links for navigators.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-white"
            aria-label="Search library"
          />
        </div>
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                !category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            onClick={() => setTypeFilter(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              typeFilter === t.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          <span>Loading library…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
          <BookOpen className="h-12 w-12 opacity-30" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <LibraryCard key={item.itemId} item={item} itemBasePath={itemBasePath} />
          ))}
        </div>
      )}
    </div>
  );
}
