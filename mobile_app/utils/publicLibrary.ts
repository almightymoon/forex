import { apiFetch, type ApiCacheMode } from './api';
import { resolveMediaUrl } from './normalize';

export type LibraryResourceType =
  | 'link'
  | 'google_sheet'
  | 'pdf'
  | 'document'
  | 'book'
  | 'video';

export type LibraryItem = {
  itemId: string;
  title: string;
  description?: string;
  resourceType: LibraryResourceType;
  externalUrl?: string;
  fileUrl?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  allowedPackages?: number[] | null;
  packageLabel?: string;
  author?: string;
  sortOrder?: number;
  hasAccess?: boolean;
  locked?: boolean;
  updatedAt?: string;
};

export function getLibraryAssetUrl(url?: string): string {
  return resolveMediaUrl(url) ?? '';
}

export async function fetchLibraryItems(params?: {
  category?: string;
  search?: string;
  type?: string;
  tag?: string;
  limit?: number;
  cache?: ApiCacheMode;
}): Promise<{ items: LibraryItem[]; total: number; categories: string[] }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  if (params?.type) qs.set('type', params.type);
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.limit) qs.set('limit', String(params.limit));

  try {
    const res = await apiFetch(`api/library?${qs.toString()}`, {
      cache: params?.cache ?? 'default',
    });
    if (res.status === 401) return { items: [], total: 0, categories: [] };
    if (!res.ok) return { items: [], total: 0, categories: [] };
    return res.json();
  } catch {
    return { items: [], total: 0, categories: [] };
  }
}

export async function fetchLibraryItem(
  itemId: string,
  cache: ApiCacheMode = 'default',
): Promise<LibraryItem | null> {
  try {
    const res = await apiFetch(`api/library/${encodeURIComponent(itemId)}`, { cache });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const RESOURCE_TYPE_LABELS: Record<LibraryResourceType, string> = {
  link: 'Link',
  google_sheet: 'Google Sheet',
  pdf: 'PDF',
  document: 'Document',
  book: 'Book',
  video: 'Video',
};

export function libraryResourceUrl(item: LibraryItem): string {
  const raw = item.externalUrl || item.fileUrl || '';
  return getLibraryAssetUrl(raw);
}

export function libraryOpenLabel(item: LibraryItem): string {
  if (item.fileUrl) return 'Open file';
  if (item.resourceType === 'google_sheet') return 'Open Google Sheet';
  if (item.resourceType === 'book') return 'View book list';
  if (item.resourceType === 'video') return 'Watch video';
  return 'Open link';
}
